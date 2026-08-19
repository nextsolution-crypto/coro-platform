import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

    // ── Helmet – headers HTTP sécurisés ──
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://*.digitaloceanspaces.com", "https://*.getcoro.io"],
        connectSrc: ["'self'", "https://api.getcoro.io", "https://app.getcoro.io", "https://client.getcoro.io"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Requis pour Puppeteer PDF
    hsts: {
      maxAge: 31536000, // 1 an
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }));

  // ── CORS strict ──
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3003',
      'https://app.getcoro.io',
      'https://client.getcoro.io',
      'https://getcoro.io',
      'https://www.getcoro.io',
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