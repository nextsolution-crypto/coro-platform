import { NestFactory } from '@nestjs/core';
import {
  bodyLimitForPath,
  OCCUPANCY_BODY_LIMIT,
  SMALL_BODY_LIMIT,
  UPLOAD_BODY_LIMIT,
} from './common/body-size-limits';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import helmet from 'helmet';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { SafeExceptionFilter } from './common/safe-exception.filter';
import { runtimeConfig } from './runtime.config';
import { CORS_ALLOWED_HEADERS } from './cors.config';
import { configureTrustedProxies } from './common/trusted-proxy';

export async function bootstrap() {
  const runtime = runtimeConfig();
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });
  configureTrustedProxies(app.getHttpAdapter().getInstance());
  const requestIdMiddleware = new RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.useGlobalFilters(new SafeExceptionFilter());

  // ── Helmet – headers HTTP sécurisés ──
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdnjs.cloudflare.com',
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://fonts.googleapis.com',
          ],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: [
            "'self'",
            'data:',
            'https://*.digitaloceanspaces.com',
            'https://*.getcoro.io',
          ],
          connectSrc: [
            "'self'",
            'https://api.getcoro.io',
            'https://app.getcoro.io',
            'https://client.getcoro.io',
          ],
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
    }),
  );

  // ── CORS strict ──
  app.enableCors({
    origin: runtime.corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [...CORS_ALLOWED_HEADERS],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
  });

  // ── Body parser avec limite pour les images/PDF base64 ──
  app.use(
    '/api/webhooks/brevo/population/sms',
    bodyParser.json({ limit: '64kb', type: 'application/json' }),
  );
  app.use(
    '/api/chat',
    bodyParser.json({ limit: '32kb', type: 'application/json' }),
  );
  // Limites par famille de routes (M3-07) : 1 Mo public, 10 Mo occupation,
  // 50 Mo pour les routes authentifiées qui reçoivent des fichiers.
  const jsonParsers = new Map(
    [SMALL_BODY_LIMIT, OCCUPANCY_BODY_LIMIT, UPLOAD_BODY_LIMIT].map((limit) => [
      limit,
      {
        json: bodyParser.json({ limit }),
        urlencoded: bodyParser.urlencoded({ limit, extended: true }),
      },
    ]),
  );
  app.use((req: any, res: any, next: any) => {
    const parsers = jsonParsers.get(bodyLimitForPath(req.originalUrl || req.url || ''))!;
    parsers.json(req, res, (error?: unknown) => {
      if (error) return next(error);
      parsers.urlencoded(req, res, next);
    });
  });

  // ── Validation globale des payloads ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les champs non déclarés dans les DTOs
      forbidNonWhitelisted: false, // Ne bloque pas (trop strict pour notre API flexible)
      transform: true, // Transforme automatiquement les types
    }),
  );

  app.setGlobalPrefix('api');
  await app.listen(runtime.port, runtime.host);
  if (runtime.qa)
    console.log(
      `CORO Backend started on http://${runtime.host}:${runtime.port} [QA]`,
    );
  if (!runtime.qa)
    console.log(
      `CORO Backend started on http://${runtime.host}:${runtime.port}`,
    );
}
if (require.main === module) void bootstrap();
