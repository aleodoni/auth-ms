import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';

import { AppModule } from './app.module';

const logger = new Logger('Main');

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBIT_MQ_SERVERS],
      queue: process.env.RABBIT_MQ_TOPIC,
      noAck: false,
    },
  });

  app.listen(() => logger.log('Microservice is listening...'));
}
bootstrap();
