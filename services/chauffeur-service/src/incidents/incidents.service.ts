import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Incident, IncidentSeverity, IncidentStatus } from './entities/incident.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { KafkaService } from '../kafka/kafka.service';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  constructor(
    @InjectRepository(Incident)
    private readonly repo: Repository<Incident>,
    private readonly kafka: KafkaService,
  ) {}

  async create(dto: CreateIncidentDto, chauffeurId: string, chauffeurName: string): Promise<Incident> {
    const incident = this.repo.create({
      missionId: dto.missionId,
      chauffeurId,
      chauffeurName,
      description: dto.description,
      severity: dto.severity ?? IncidentSeverity.MEDIUM,
      status: IncidentStatus.OPEN,
    });
    const saved = await this.repo.save(incident);

    await this.kafka.publish('incident.created', {
      incidentId: saved.id,
      missionId: saved.missionId,
      chauffeurId: saved.chauffeurId,
      chauffeurName: saved.chauffeurName,
      description: saved.description,
      severity: saved.severity,
      createdAt: saved.createdAt,
    });

    this.logger.log(`Incident ${saved.id} created by chauffeur ${chauffeurId} for mission ${dto.missionId}`);
    return saved;
  }

  findForChauffeur(chauffeurId: string): Promise<Incident[]> {
    return this.repo.find({
      where: { chauffeurId },
      order: { createdAt: 'DESC' },
    });
  }

  findForMission(missionId: string, chauffeurId: string): Promise<Incident[]> {
    return this.repo.find({
      where: { missionId, chauffeurId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, chauffeurId: string): Promise<Incident> {
    const incident = await this.repo.findOne({ where: { id, chauffeurId } });
    if (!incident) throw new NotFoundException('Incident introuvable');
    return incident;
  }
}
