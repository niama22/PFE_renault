import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident, IncidentStatus } from './entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ClientsService } from '../clients/clients.service';
import { KafkaService } from '../kafka/kafka.service';
import { JwtUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class IncidentsService implements OnModuleInit {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident)
    private incidentsRepo: Repository<Incident>,
    private clientsService: ClientsService,
    private kafkaService: KafkaService,
  ) {}

  async onModuleInit() {
    this.initConsumerWithRetry();
  }

  private async initConsumerWithRetry(attempt = 1) {
    const consumer = this.kafkaService.createConsumer('client-service-incidents-group');
    try {
      await consumer.connect();
      await consumer.subscribe({
        topics: ['incident.resolved', 'incident.closed', 'incident.in_progress'],
        fromBeginning: false,
      });
      await consumer.run({
        eachMessage: async ({ topic, message }) => {
          const data = JSON.parse(message.value!.toString());
          if (topic === 'incident.resolved')    await this.onIncidentResolved(data);
          if (topic === 'incident.closed')      await this.onIncidentClosed(data);
          if (topic === 'incident.in_progress') await this.onIncidentInProgress(data);
        },
      });
      this.logger.log('Kafka consumer started for incident events');
    } catch (err) {
      const delay = Math.min(attempt * 5000, 30000);
      this.logger.warn(`Kafka consumer attempt ${attempt} failed: ${err.message}. Retry in ${delay / 1000}s`);
      if (attempt < 12) {
        setTimeout(() => this.initConsumerWithRetry(attempt + 1), delay);
      } else {
        this.logger.error('Kafka consumer incidents init permanently failed after 12 attempts');
      }
    }
  }

  private async onIncidentResolved(data: { incidentId: string; operatorResponse?: string }) {
    try {
      await this.incidentsRepo.update(data.incidentId, {
        status: IncidentStatus.RESOLVED,
        operatorResponse: data.operatorResponse ?? null,
      });
      this.logger.log(`Incident ${data.incidentId} marked RESOLVED`);
    } catch (err) {
      this.logger.error(`Failed to update resolved incident ${data.incidentId}`, err.message);
    }
  }

  private async onIncidentClosed(data: { incidentId: string }) {
    try {
      await this.incidentsRepo.update(data.incidentId, {
        status: IncidentStatus.CLOSED,
      });
      this.logger.log(`Incident ${data.incidentId} marked CLOSED`);
    } catch (err) {
      this.logger.error(`Failed to update closed incident ${data.incidentId}`, err.message);
    }
  }

  private async onIncidentInProgress(data: { incidentId: string }) {
    try {
      await this.incidentsRepo.update(data.incidentId, {
        status: IncidentStatus.IN_PROGRESS,
      });
      this.logger.log(`Incident ${data.incidentId} marked IN_PROGRESS`);
    } catch (err) {
      this.logger.error(`Failed to update in_progress incident ${data.incidentId}`, err.message);
    }
  }

  async create(user: JwtUser, dto: CreateIncidentDto): Promise<Incident> {
    const client = await this.clientsService.findOrCreate(user);

    const incident = this.incidentsRepo.create({
      clientId: client.id,
      orderId: dto.orderId,
      description: dto.description,
      severity: dto.severity || 'MEDIUM',
      attachments: dto.attachments || [],
    });

    const saved = await this.incidentsRepo.save(incident);

    await this.kafkaService.publish('incident.created', {
      incidentId: saved.id,
      clientId: user.keycloakId,        // Keycloak UUID pour lookup admin
      clientCode: client.clientCode,
      clientName: `${client.firstName ?? ''} ${client.lastName ?? ''}`.trim(),
      orderId: saved.orderId,
      description: saved.description,
      severity: saved.severity,
      createdAt: saved.createdAt,
    });

    return saved;
  }

  async findAll(user: JwtUser): Promise<Incident[]> {
    const client = await this.clientsService.findOrCreate(user);
    return this.incidentsRepo.find({
      where: { clientId: client.id },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(user: JwtUser, incidentId: string): Promise<Incident> {
    const client = await this.clientsService.findOrCreate(user);
    const incident = await this.incidentsRepo.findOne({
      where: { id: incidentId, clientId: client.id },
      relations: ['order'],
    });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return incident;
  }
}
