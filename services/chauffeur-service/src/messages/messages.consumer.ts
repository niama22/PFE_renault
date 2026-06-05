import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { KafkaService } from '../kafka/kafka.service';
import { MessagesService } from './messages.service';

@Injectable()
export class MessagesConsumer implements OnModuleInit {
  private readonly logger = new Logger(MessagesConsumer.name);

  constructor(
    private readonly kafka: KafkaService,
    private readonly messagesService: MessagesService,
  ) {}

  async onModuleInit() {
    const consumer = this.kafka.createConsumer('chauffeur-messages-group');
    await consumer.connect();
    await consumer.subscribe({ topic: 'message.operator_reply', fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const payload = JSON.parse(message.value!.toString());
          await this.messagesService.saveOperatorReply(payload);
        } catch (err) {
          this.logger.error('Failed to process operator reply', err.message);
        }
      },
    });

    this.logger.log('Subscribed to message.operator_reply');
  }
}
