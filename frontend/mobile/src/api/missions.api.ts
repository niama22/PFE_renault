import { api } from './client';
import type { Mission } from '../types';

const BASE = '/api/v1/chauffeur/missions';

export const getMissions = () => api.get<{ data: Mission[] }>(BASE).then(r => r.data.data ?? []);
export const getMission = (id: string) => api.get<{ data: Mission }>(`${BASE}/${id}`).then(r => r.data.data);
export const acknowledgeMission = (id: string) => api.post<{ data: Mission }>(`${BASE}/${id}/acknowledge`).then(r => r.data.data);
export const startMission = (id: string) => api.post<{ data: Mission }>(`${BASE}/${id}/start`).then(r => r.data.data);
export const completeMission = (id: string, notes?: string) =>
  api.post<{ data: Mission }>(`${BASE}/${id}/complete`, { notes }).then(r => r.data.data);
