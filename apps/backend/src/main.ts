import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { SerializeDecimalsInterceptor } from './common/interceptors/serialize-decimals.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));
  app.useGlobalInterceptors(new SerializeDecimalsInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
