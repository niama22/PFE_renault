import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class AuthService {
  private readonly tokenUrl: string;
  private readonly logoutUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private config: ConfigService) {
    const base = config.get('KEYCLOAK_INTERNAL_URL', 'http://keycloak:8180');
    const realm = config.get('KEYCLOAK_REALM', 'optiflow');
    const baseUrl = `${base}/realms/${realm}/protocol/openid-connect`;
    this.tokenUrl = `${baseUrl}/token`;
    this.logoutUrl = `${baseUrl}/logout`;
    this.clientId = config.get('KEYCLOAK_CLIENT_ID', 'optiflow-web');
    this.clientSecret = config.get('KEYCLOAK_CLIENT_SECRET', 'optiflow-web-secret-change-in-prod');
  }

  async login(clientCode: string, password: string) {
    try {
      const params = new URLSearchParams({
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: clientCode,
        password,
        scope: 'openid profile email',
      });

      const { data } = await axios.post(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
      };
    } catch (err) {
      if (err.response?.status === 401) {
        throw new UnauthorizedException('Code client ou mot de passe incorrect');
      }
      throw new UnauthorizedException("Erreur d'authentification");
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });

      const { data } = await axios.post(this.tokenUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch {
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }

  async logout(refreshToken: string) {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      });
      await axios.post(this.logoutUrl, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch {
      // Ignore logout errors
    }
    return { message: 'Déconnexion réussie' };
  }
}
