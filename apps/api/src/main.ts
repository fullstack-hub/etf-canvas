import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

// BigInt → String 자동 직렬화 (Fastify JSON.stringify 에러 + 정밀도 손실 방지)
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors({ origin: ['https://etf-canvas.com', 'http://localhost:3000'], methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ETF Canvas API')
      .setDescription('ETF Canvas 백엔드 API')
      .setVersion('0.5.7')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    await SwaggerModule.setup('docs', app, document);
  }

  await app.listen(4000, '0.0.0.0');
  console.log('ETF Canvas API running on http://localhost:4000');
}
bootstrap();
