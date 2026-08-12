import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // ── Helmet — headers HTTP sécurisés ──
  app.use(helmet({
    contentSecurityPolicy: false, // Désactivé pour Puppeteer PDF generation
    crossOriginEmbedderPolicy: false,
  }));

  // ── CORS strict ──
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
      'https://app.getcoro.io',
      'https://client.getcoro.io',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Body parser avec limite pour les images/PDF base64 ──
  app.use(bodyParser.json({ limit: '250mb' }));
  app.use(bodyParser.urlencoded({ limit: '250mb', extended: true }));

  // ── Validation globale des payloads ──
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,           // Supprime les champs non déclarés dans les DTOs
    forbidNonWhitelisted: false, // Ne bloque pas (trop strict pour notre API flexible)
    transform: true,           // Transforme automatiquement les types
  }));

  app.setGlobalPrefix('api');
  await app.listen(3002);
  console.log('CORO Backend démarre sur http://localhost:3002');
}
bootstrap();