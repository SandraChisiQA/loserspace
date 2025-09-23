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

  const expressInstance = express();

  try {
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
      'https://api.losers.space',
      // Allow Vercel preview URLs
      /\.vercel\.app$/,
      // Allow localhost for development
      'http://localhost:3000',
      'http://localhost:3001',
    ];

    app.enableCors({
      origin: (origin, callback) => {
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

    cachedApp = app.getHttpAdapter().getInstance();
    return cachedApp;
  } catch (error) {
    console.error('Failed to create NestJS app:', error);
    // Return a simple Express app as fallback
    const fallbackApp = express();
    fallbackApp.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    fallbackApp.get('/', (req, res) => {
      res.json({
        message: 'Losers API is running (fallback mode)',
        status: 'ok',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    });

    fallbackApp.get('/api/posts', (req, res) => {
      res.json({
        posts: [],
        message: 'Database connection failed',
        error: error.message
      });
    });

    return fallbackApp;
  }
}

export default async (req: any, res: any) => {
  const app = await createNestServer();
  return app(req, res);
};