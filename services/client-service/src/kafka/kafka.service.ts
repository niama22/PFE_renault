import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer, logLevel } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private config: ConfigService) {
    this.kafka = new Kafka({
      clientId: 'client-service',
      brokers: [this.config.get('KAFKA_BROKERS', 'kafka:29092')],
      logLevel: logLevel.WARN,
      retry: { retries: 5, initialRetryTime: 300, maxRetryTime: 30000 },
      requestTimeout: 60000,
      connectionTimeout: 10000,
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log('Kafka producer connected');
    } catch (err) {
      this.logger.error('Kafka producer connection failed', err.message);
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publish(topic: string, payload: object): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(payload),
            headers: {
              source: 'client-service',
              timestamp: Date.now().toString(),
            },
          },
        ],
      });
    } catch (err) {
      this.logger.error(`Failed to publish to ${topic}`, err.message);
    }
  }

  createConsumer(groupId: string): Consumer {
    return this.kafka.consumer({ groupId });
  }
}
