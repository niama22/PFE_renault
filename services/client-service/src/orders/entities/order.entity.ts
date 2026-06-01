import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Client } from '../../clients/entities/client.entity';

export enum OrderStatus {
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
  PLANNED = 'PLANNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class VehicleItem {
  vehicleType?: string;
  vehicleModelId?: string;
  quantity: number;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: true })
  orderNumber: string;

  @ManyToOne(() => Client, (client) => client.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column('jsonb')
  vehicles: VehicleItem[];

  @Column('date')
  requestedDeliveryDate: Date;

  @Column('jsonb')
  deliveryAddress: Record<string, any>;

  @Column({ type: 'float', nullable: true, name: 'delivery_lat' })
  deliveryLat: number;

  @Column({ type: 'float', nullable: true, name: 'delivery_lng' })
  deliveryLng: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_VALIDATION })
  status: OrderStatus;

  @Column({ nullable: true, type: 'timestamp' })
  estimatedArrivalDate: Date;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  operatorNotes: string;

  @Column({ nullable: true, name: 'mission_id' })
  missionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
