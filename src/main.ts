import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = 3000;
  await app.listen(port);

  logger.log(`🚀 서버 시작: http://localhost:${port}`);
}

bootstrap();
