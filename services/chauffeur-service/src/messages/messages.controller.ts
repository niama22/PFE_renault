import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@ApiTags('Messages')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('api/v1/chauffeur/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Envoyer un message à l\'opérateur' })
  send(@Body() dto: SendMessageDto, @CurrentUser() user: JwtUser) {
    return this.service.send(dto, user.keycloakId, user.username ?? user.email);
  }

  @Get('mission/:missionId')
  @ApiOperation({ summary: 'Fil de discussion d\'une mission' })
  getThread(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.getThread(missionId, user.keycloakId);
  }

  @Post('mission/:missionId/read')
  @ApiOperation({ summary: 'Marquer les messages opérateur comme lus' })
  markRead(
    @Param('missionId', ParseUUIDPipe) missionId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.markRead(missionId, user.keycloakId);
  }
}
