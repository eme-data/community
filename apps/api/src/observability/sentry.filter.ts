import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { captureException } from './sentry';

@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // Only forward unexpected (non-HTTP / 5xx) errors to Sentry. Validation
    // errors and 4xx don't need to be reported.
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (!(exception instanceof HttpException) || status >= 500) {
      captureException(exception);
    }

    // Re-throw so Nest's default handler still produces the response.
    if (exception instanceof HttpException) throw exception;
    this.logger.error(exception);
    throw exception;
  }
}
