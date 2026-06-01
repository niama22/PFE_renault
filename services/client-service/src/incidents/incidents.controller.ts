import { Body, Controller, Get, Param, Post, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Incidents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('client')
@Controller('api/v1/clients/me/incidents')
export class IncidentsController {
  constructor(private incidentsService: IncidentsService) {}

  @Post()
  @ApiOperation({ summary: 'Signaler un incident' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateIncidentDto) {
    return this.incidentsService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Consulter mes réclamations' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.incidentsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un incident' })
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.incidentsService.findOne(user, id);
  }
}
