import { Body, Controller, Get, Param, Post, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles, RolesGuard } from '../common/guards/roles.guard';

@ApiTags('Commandes')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('client')
@Controller('api/v1/clients/me/orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Soumettre une commande de véhicules' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Consulter mes commandes' })
  findAll(@CurrentUser() user: JwtUser) {
    return this.ordersService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande' })
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(user, id);
  }
}
