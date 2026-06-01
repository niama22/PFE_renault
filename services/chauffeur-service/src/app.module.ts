import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { KafkaModule } from './kafka/kafka.module';
import { MissionsModule } from './missions/missions.module';
import { GpsModule } from './gps/gps.module';
import { IncidentsModule } from './incidents/incidents.module';
import { MessagesModule } from './messages/messages.module';
import { Mission } from './missions/entities/mission.entity';
import { Incident } from './incidents/entities/incident.entity';
import { Message } from './messages/entities/message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [Mission, Incident, Message],
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    }),
    KafkaModule,
    AuthModule,
    MissionsModule,
    GpsModule,
    IncidentsModule,
    MessagesModule,
  ],
})
export class AppModule {}
