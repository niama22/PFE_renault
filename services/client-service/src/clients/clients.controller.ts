import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { UpdateProfileDto, UpdateAddressDto } from './dto/update-profile.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Profil Client')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('client')
@Controller('api/v1/clients/me')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Consulter mon profil' })
  async getProfile(@CurrentUser() user: JwtUser) {
    return this.clientsService.findOrCreate(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Mettre à jour mes informations personnelles' })
  async updateProfile(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.clientsService.updateProfile(user.keycloakId, dto);
  }

  @Patch('address')
  @ApiOperation({ summary: 'Mettre à jour mon adresse de livraison' })
  async updateAddress(@CurrentUser() user: JwtUser, @Body() dto: UpdateAddressDto) {
    return this.clientsService.updateDeliveryAddress(user.keycloakId, dto);
  }
}
