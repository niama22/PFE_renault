import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KafkaService } from '../kafka/kafka.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { GpsUpdateDto } from './gps.dto';

@ApiTags('GPS')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/chauffeur/gps')
export class GpsController {
  constructor(private readonly kafka: KafkaService) {}

  @Post()
  @ApiOperation({ summary: 'Publier une position GPS' })
  async publishPosition(
    @Body() dto: GpsUpdateDto,
    @CurrentUser() user: JwtUser,
  ) {
    await this.kafka.publish('gps.updated', {
      chauffeurId: user.keycloakId,
      chauffeurName: user.username,
      missionId: dto.missionId ?? null,
      latitude: dto.latitude,
      longitude: dto.longitude,
      speed: dto.speed ?? null,
      timestamp: new Date().toISOString(),
    });
    return { published: true, timestamp: new Date().toISOString() };
  }
}
