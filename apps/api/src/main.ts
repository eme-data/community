import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.APP_URL ? [process.env.APP_URL] : true,
      credentials: true,
    },
  });

  // Trust the reverse proxy (Caddy) so req.ip reflects the real client IP
  // — crucial for rate limiting.
  app.getHttpAdapter().getInstance().set?.('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false, // CSP is enforced by Caddy on the edge
      crossOriginEmbedderPolicy: false,
    }),
  );

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
