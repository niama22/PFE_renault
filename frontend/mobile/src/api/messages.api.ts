import { api } from './client';
import type { Message } from '../types';

const BASE = '/api/v1/chauffeur/messages';

export const getThread = (missionId: string) =>
  api.get<{ data: Message[] }>(`${BASE}/mission/${missionId}`).then(r => r.data.data ?? []);
export const sendMessage = (missionId: string, content: string) =>
  api.post<{ data: Message }>(BASE, { missionId, content }).then(r => r.data.data);
export const markRead = (missionId: string) =>
  api.post(`${BASE}/mission/${missionId}/read`).then(r => r.data);
