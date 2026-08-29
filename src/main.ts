import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  // Redundante com o hidePoweredBy do helmet, mas explícito: garante que o
  // header X-Powered-By: Express nunca seja enviado.
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('MedidaCerta API')
    .setDescription('API REST do projeto acadêmico MedidaCerta')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`MedidaCerta API rodando em http://localhost:${port}`);

  console.log(`Swagger disponível em http://localhost:${port}/api`);
}
bootstrap();
