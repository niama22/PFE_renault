import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum MissionStatus {
  PENDING      = 'PENDING',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS  = 'IN_PROGRESS',
  COMPLETED    = 'COMPLETED',
}

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tournee_id', unique: true })
  tourneeId: string;

  @Column({ name: 'tournee_number' })
  tourneeNumber: string;

  @Column({ name: 'chauffeur_id' })
  chauffeurId: string;

  @Column({ name: 'chauffeur_name', nullable: true })
  chauffeurName: string;

  @Column({ name: 'planned_date', nullable: true })
  plannedDate: string;

  @Column({ name: 'order_ids_json', type: 'text', nullable: true })
  orderIdsJson: string;

  @Column({ name: 'operator_notes', nullable: true })
  operatorNotes: string;

  @Column({ name: 'responsable_id', nullable: true })
  responsableId: string;

  @Column({ type: 'enum', enum: MissionStatus, default: MissionStatus.PENDING })
  status: MissionStatus;

  @Column({ name: 'acknowledged_at', nullable: true })
  acknowledgedAt: Date;

  @Column({ name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'completion_notes', nullable: true })
  completionNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
