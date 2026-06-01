import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { OrdersModule } from './orders/orders.module';
import { IncidentsModule } from './incidents/incidents.module';
import { KafkaModule } from './kafka/kafka.module';
import { Client } from './clients/entities/client.entity';
import { Order } from './orders/entities/order.entity';
import { Incident } from './incidents/entities/incident.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [Client, Order, Incident],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    AuthModule,
    ClientsModule,
    OrdersModule,
    IncidentsModule,
  ],
})
export class AppModule {}
