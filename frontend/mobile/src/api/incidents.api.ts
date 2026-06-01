import { api } from './client';
import type { Incident, IncidentSeverity } from '../types';

const BASE = '/api/v1/chauffeur/incidents';

export const getIncidents = () => api.get<Incident[]>(BASE).then(r => r.data);
export const getMissionIncidents = (missionId: string) =>
  api.get<Incident[]>(`${BASE}/mission/${missionId}`).then(r => r.data);
export const createIncident = (data: { missionId: string; description: string; severity?: IncidentSeverity }) =>
  api.post<Incident>(BASE, data).then(r => r.data);
