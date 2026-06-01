import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Replace with your machine's IP when testing on device
export const API_BASE = 'http://192.168.11.111:8000';
export const KEYCLOAK_URL = 'http://192.168.11.111:8180';
export const REALM = 'optiflow';
export const CLIENT_ID = 'optiflow-mobile';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = await SecureStore.getItemAsync('refreshToken');
      if (refresh) {
        try {
          const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: CLIENT_ID,
            refresh_token: refresh,
          });
          const res = await axios.post(
            `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
            params.toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
          await SecureStore.setItemAsync('token', res.data.access_token);
          await SecureStore.setItemAsync('refreshToken', res.data.refresh_token);
          error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api.request(error.config);
        } catch {
          await SecureStore.deleteItemAsync('token');
          await SecureStore.deleteItemAsync('refreshToken');
        }
      }
    }
    return Promise.reject(error);
  }
);
