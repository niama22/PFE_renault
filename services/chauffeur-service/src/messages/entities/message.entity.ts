import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum MessageSender {
  CHAUFFEUR = 'CHAUFFEUR',
  OPERATEUR = 'OPERATEUR',
}

@Entity('chauffeur_messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'mission_id' })
  missionId: string;

  @Column({ name: 'chauffeur_id' })
  chauffeurId: string;

  @Column({ type: 'enum', enum: MessageSender })
  sender: MessageSender;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'sender_name', nullable: true })
  senderName: string;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
