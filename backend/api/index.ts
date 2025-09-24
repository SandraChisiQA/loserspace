import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import express from 'express';

let cachedApp: any;

async function createNestServer() {
  if (cachedApp) {
    return cachedApp;
  }

  console.log('Creating NestJS app...');
  const expressInstance = express();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: ['error', 'warn', 'log'], // Added 'log' for more visibility
    }
  );

  // Enable CORS for frontend
  const allowedOrigins = [
    'https://losers.space',
    'https://api.losers.space',
    /\.vercel\.app$/,
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      console.log('CORS check for origin:', origin);
      if (!origin) return callback(null, true);
      const ok = allowedOrigins.some(o =>
        o instanceof RegExp ? o.test(origin) : o === origin
      );
      return ok ? callback(null, true) : callback(new Error('CORS blocked'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  console.log('NestJS app initialized successfully');

  cachedApp = app.getHttpAdapter().getInstance();
  return cachedApp;
}

export default async (req: any, res: any) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  
  try {
    const app = await createNestServer();
    return app(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};