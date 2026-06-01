import { api } from './client';
import type { Message } from '../types';

const BASE = '/api/v1/chauffeur/messages';

export const getThread = (missionId: string) =>
  api.get<Message[]>(`${BASE}/mission/${missionId}`).then(r => r.data);
export const sendMessage = (missionId: string, content: string) =>
  api.post<Message>(BASE, { missionId, content }).then(r => r.data);
export const markRead = (missionId: string) =>
  api.post(`${BASE}/mission/${missionId}/read`).then(r => r.data);
