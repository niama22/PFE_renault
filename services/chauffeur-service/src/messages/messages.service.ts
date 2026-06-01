import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageSender } from './entities/message.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly repo: Repository<Message>,
    private readonly kafka: KafkaService,
  ) {}

  async send(dto: SendMessageDto, chauffeurId: string, chauffeurName: string): Promise<Message> {
    const message = this.repo.create({
      missionId: dto.missionId,
      chauffeurId,
      sender: MessageSender.CHAUFFEUR,
      senderName: chauffeurName,
      content: dto.content,
    });
    const saved = await this.repo.save(message);

    await this.kafka.publish('message.sent', {
      messageId: saved.id,
      missionId: saved.missionId,
      chauffeurId: saved.chauffeurId,
      chauffeurName: saved.senderName,
      sender: MessageSender.CHAUFFEUR,
      content: saved.content,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  getThread(missionId: string, chauffeurId: string): Promise<Message[]> {
    return this.repo.find({
      where: { missionId, chauffeurId },
      order: { createdAt: 'ASC' },
    });
  }

  async markRead(missionId: string, chauffeurId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Message)
      .set({ readAt: new Date() })
      .where('mission_id = :missionId AND chauffeur_id = :chauffeurId AND sender = :sender AND read_at IS NULL', {
        missionId, chauffeurId, sender: MessageSender.OPERATEUR,
      })
      .execute();
  }

  async saveOperatorReply(payload: any): Promise<void> {
    const message = this.repo.create({
      missionId: payload.missionId,
      chauffeurId: payload.chauffeurId,
      sender: MessageSender.OPERATEUR,
      senderName: payload.operatorName ?? 'Opérateur',
      content: payload.content,
    });
    await this.repo.save(message);
    this.logger.log(`Operator reply saved for mission ${payload.missionId}`);
  }
}
