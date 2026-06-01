import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_INTERNAL_URL', 'http://keycloak:8180');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'optiflow');

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['RS256'],
    });
  }

  validate(payload: any) {
    if (!payload.sub) throw new UnauthorizedException('Token invalide');
    return {
      keycloakId: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.roles || [],
      clientCode: payload.clientCode || payload.preferred_username,
    };
  }
}
