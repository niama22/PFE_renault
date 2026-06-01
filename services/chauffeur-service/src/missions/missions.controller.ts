import {
  Controller, Get, Post, Param, Body,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags, ApiBearerAuth, ApiOperation,
} from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CompleteMissionDto } from './dto/complete-mission.dto';

@ApiTags('Missions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/chauffeur/missions')
export class MissionsController {
  constructor(private readonly service: MissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes missions assignées' })
  getMyMissions(@CurrentUser() user: JwtUser) {
    return this.service.findAllForChauffeur(user.keycloakId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une mission' })
  getMission(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.findOne(id, user.keycloakId);
  }

  @Post(':id/acknowledge')
  @ApiOperation({ summary: 'Accuser réception d\'une mission (obligatoire avant démarrage)' })
  acknowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.acknowledge(id, user.keycloakId);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Démarrer une mission' })
  start(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.start(id, user.keycloakId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Terminer une mission' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: CompleteMissionDto,
  ) {
    return this.service.complete(id, user.keycloakId, dto);
  }
}
