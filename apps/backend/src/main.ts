import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const port = config.getOrThrow<number>('app.port');
  const corsOrigin = config.get<string>('app.corsOrigin');

  app.enableShutdownHooks();
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : false,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());

  await app.listen(port);
  Logger.log(`BA Copilot backend is listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
