import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentification')
@Controller('api/v1/auth/client')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Connexion avec code client et mot de passe' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.clientCode, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renouveler le token d\'accès' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Déconnexion' })
  logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: JwtUser) {
    return this.authService.logout(dto.refreshToken);
  }
}
