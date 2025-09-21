import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import express from 'express';

const server = express();

let app: any;

async function createNestServer(expressInstance: express.Express) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
    {
      logger: ['error', 'warn'],
    }
  );

  // Enable CORS for frontend
  const allowedOrigins = [
    'https://losers.space',
    // Allow Vercel preview URLs
    /\.vercel\.app$/,
    // Allow localhost for development
    'http://localhost:3000',
    'http://localhost:3001',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server / curl
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

  app.setGlobalPrefix('api');

  await app.init();
  return app;
}

export default async (req: any, res: any) => {
  if (!app) {
    app = await createNestServer(server);
  }

  return server(req, res);
};