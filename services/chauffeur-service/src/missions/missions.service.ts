import {
  Injectable, NotFoundException, ConflictException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mission, MissionStatus } from './entities/mission.entity';
import { KafkaService } from '../kafka/kafka.service';
import { CompleteMissionDto } from './dto/complete-mission.dto';

@Injectable()
export class MissionsService {
  private readonly logger = new Logger(MissionsService.name);

  constructor(
    @InjectRepository(Mission)
    private readonly repo: Repository<Mission>,
    private readonly kafka: KafkaService,
  ) {}

  findAllForChauffeur(chauffeurId: string): Promise<Mission[]> {
    return this.repo.find({
      where: { chauffeurId },
      order: { plannedDate: 'ASC', createdAt: 'DESC' },
    });
  }

  async findOne(id: string, chauffeurId: string): Promise<Mission> {
    const mission = await this.repo.findOne({ where: { id, chauffeurId } });
    if (!mission) throw new NotFoundException('Mission introuvable');
    return mission;
  }

  async acknowledge(id: string, chauffeurId: string): Promise<Mission> {
    const mission = await this.findOne(id, chauffeurId);

    if (mission.status !== MissionStatus.PENDING) {
      throw new ConflictException(`Impossible d'accuser réception d'une mission en état ${mission.status}`);
    }

    mission.status = MissionStatus.ACKNOWLEDGED;
    mission.acknowledgedAt = new Date();
    const saved = await this.repo.save(mission);

    await this.kafka.publish('mission.acknowledged', {
      missionId: saved.id,
      tourneeId: saved.tourneeId,
      tourneeNumber: saved.tourneeNumber,
      chauffeurId: saved.chauffeurId,
      chauffeurName: saved.chauffeurName,
      acknowledgedAt: saved.acknowledgedAt,
    });

    this.logger.log(`Mission ${saved.tourneeNumber} acknowledged by chauffeur ${chauffeurId}`);
    return saved;
  }

  async start(id: string, chauffeurId: string): Promise<Mission> {
    const mission = await this.findOne(id, chauffeurId);

    if (![MissionStatus.PENDING, MissionStatus.ACKNOWLEDGED].includes(mission.status)) {
      throw new ConflictException(`Impossible de démarrer une mission en état ${mission.status}`);
    }

    mission.status = MissionStatus.IN_PROGRESS;
    mission.startedAt = new Date();
    const saved = await this.repo.save(mission);

    await this.kafka.publish('mission.started', {
      missionId: saved.id,
      tourneeId: saved.tourneeId,
      tourneeNumber: saved.tourneeNumber,
      chauffeurId: saved.chauffeurId,
      chauffeurName: saved.chauffeurName,
      startedAt: saved.startedAt,
    });

    this.logger.log(`Mission ${saved.tourneeNumber} started by chauffeur ${chauffeurId}`);
    return saved;
  }

  async complete(id: string, chauffeurId: string, dto: CompleteMissionDto): Promise<Mission> {
    const mission = await this.findOne(id, chauffeurId);

    if (mission.status !== MissionStatus.IN_PROGRESS) {
      throw new ConflictException(`Impossible de terminer une mission en état ${mission.status}`);
    }

    mission.status = MissionStatus.COMPLETED;
    mission.completedAt = new Date();
    mission.completionNotes = dto.notes ?? null;
    const saved = await this.repo.save(mission);

    await this.kafka.publish('mission.completed', {
      missionId: saved.id,
      tourneeId: saved.tourneeId,
      tourneeNumber: saved.tourneeNumber,
      chauffeurId: saved.chauffeurId,
      chauffeurName: saved.chauffeurName,
      completedAt: saved.completedAt,
      notes: saved.completionNotes,
    });

    this.logger.log(`Mission ${saved.tourneeNumber} completed by chauffeur ${chauffeurId}`);
    return saved;
  }

  async createFromTourneeEvent(payload: any): Promise<Mission> {
    const existing = await this.repo.findOne({ where: { tourneeId: payload.tourneeId } });
    if (existing) {
      this.logger.debug(`Mission for tournée ${payload.tourneeId} already exists`);
      return existing;
    }

    const mission = this.repo.create({
      tourneeId: payload.tourneeId,
      tourneeNumber: payload.tourneeNumber,
      chauffeurId: payload.chauffeurId,
      chauffeurName: payload.chauffeurName,
      plannedDate: payload.plannedDate,
      orderIdsJson: payload.orderIdsJson,
      operatorNotes: payload.operatorNotes,
      responsableId: payload.responsableId,
      status: MissionStatus.PENDING,
    });

    const saved = await this.repo.save(mission);
    this.logger.log(`Mission created from tournée ${payload.tourneeNumber} for chauffeur ${payload.chauffeurId}`);
    return saved;
  }
}
