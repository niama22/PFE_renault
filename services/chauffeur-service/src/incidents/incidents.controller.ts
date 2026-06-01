import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/chauffeur/incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Signaler un incident' })
  create(@Body() dto: CreateIncidentDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user.keycloakId, user.username ?? user.email);
  }

  @Get()
  @ApiOperation({ summary: 'Mes incidents signalés' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.service.findForChauffeur(user.keycloakId);
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Incidents d\'une mission' })
  findForMission(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.findForMission(missionId, user.keycloakId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un incident' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user.keycloakId);
  }
}
