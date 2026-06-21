import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation: har DTO ka input automatically validate hoga
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // jo fields DTO mein nahi, wo hata do
      forbidNonWhitelisted: true, // extra fields aayein to error do
      transform: true, // input ko DTO type mein convert karo
    }),
  );

  // Swagger / API documentation setup
  const config = new DocumentBuilder()
    .setTitle('LaptopHub API')
    .setDescription('LaptopHub Retail Suite backend')
    .setVersion('1.0')
    .addBearerAuth() // JWT token ke liye
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // /docs pe documentation milegi

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`App chal rahi hai: http://localhost:${port}`);
  console.log(`API docs: http://localhost:${port}/docs`);
}
bootstrap();