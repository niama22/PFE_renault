import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Incident } from '../../incidents/entities/incident.entity';

export class DeliveryAddress {
  street: string;
  city: string;
  postalCode: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  keycloakId: string;

  @Column({ unique: true })
  clientCode: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  company: string;

  @Column('jsonb', { nullable: true })
  deliveryAddress: DeliveryAddress;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Order, (order) => order.client)
  orders: Order[];

  @OneToMany(() => Incident, (incident) => incident.client)
  incidents: Incident[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
