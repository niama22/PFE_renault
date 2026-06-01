import axios from 'axios';
import { KEYCLOAK_URL, REALM, CLIENT_ID } from './client';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export async function loginWithPassword(username: string, password: string): Promise<TokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: CLIENT_ID,
    username,
    password,
  });
  const res = await axios.post<TokenResponse>(
    `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  return res.data;
}

export function parseJwt(token: string): Record<string, any> {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}
