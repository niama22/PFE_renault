import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesConsumer } from './messages.consumer';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [TypeOrmModule.forFeature([Message]), KafkaModule],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesConsumer],
  exports: [MessagesService],
})
export class MessagesModule {}
