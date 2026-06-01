import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './entities/mission.entity';
import { MissionsService } from './missions.service';
import { MissionsController } from './missions.controller';
import { TourneeConsumer } from './tournee.consumer';

@Module({
  imports: [TypeOrmModule.forFeature([Mission])],
  providers: [MissionsService, TourneeConsumer],
  controllers: [MissionsController],
  exports: [MissionsService],
})
export class MissionsModule {}
