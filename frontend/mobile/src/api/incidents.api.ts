import { api } from './client';
import type { Incident, IncidentSeverity } from '../types';

const BASE = '/api/v1/chauffeur/incidents';

export const getIncidents = () => api.get<{ data: Incident[] }>(BASE).then(r => r.data.data ?? []);
export const getMissionIncidents = (missionId: string) =>
  api.get<{ data: Incident[] }>(`${BASE}/mission/${missionId}`).then(r => r.data.data ?? []);
export const createIncident = (data: { missionId: string; description: string; severity?: IncidentSeverity }) =>
  api.post<{ data: Incident }>(BASE, data).then(r => r.data.data);
