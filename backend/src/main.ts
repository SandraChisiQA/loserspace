import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Option 1: Add /api prefix to all routes
  // Routes will be: /api/*, /api/auth/*, /api/posts/*
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
