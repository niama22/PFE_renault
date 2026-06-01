import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { KafkaService } from '../kafka/kafka.service';
import { MissionsService } from './missions.service';

@Injectable()
export class TourneeConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TourneeConsumer.name);
  private consumer = this.kafka.createConsumer('chauffeur-service-group');

  constructor(
    private readonly kafka: KafkaService,
    private readonly missionsService: MissionsService,
  ) {}

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topics: ['tournee.validated'], fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const payload = JSON.parse(message.value.toString());
          if (!payload.chauffeurId) return;
          await this.missionsService.createFromTourneeEvent(payload);
        } catch (err) {
          this.logger.error('Error processing tournee.validated', err.message, err.stack);
        }
      },
    });

    this.logger.log('Subscribed to tournee.validated');
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
  }
}
