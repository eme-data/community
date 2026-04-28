import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { json, raw } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { initSentry } from './observability/sentry';
import { SentryExceptionFilter } from './observability/sentry.filter';

async function bootstrap() {
  initSentry();

  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.APP_URL ? [process.env.APP_URL] : true,
      credentials: true,
    },
    bodyParser: false,
    bufferLogs: true,
  });

  app.useLogger(app.get(PinoLogger));

  app.getHttpAdapter().getInstance().set?.('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Stripe webhook needs the raw body for signature verification.
  app.use('/api/billing/webhook', raw({ type: 'application/json' }), (req: any, _res, next) => {
    req.rawBody = req.body;
    next();
  });
  app.use(json({ limit: '5mb' }));

  app.useGlobalFilters(new SentryExceptionFilter());

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://0.0.0.0:${port}`, 'Bootstrap');
}

bootstrap();
