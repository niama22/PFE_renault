export type MissionStatus = 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type MessageSender = 'CHAUFFEUR' | 'OPERATEUR';

export interface Mission {
  id: string;
  tourneeId: string;
  tourneeNumber: string;
  chauffeurId: string;
  chauffeurName: string;
  plannedDate: string;
  orderIdsJson: string;
  operatorNotes: string;
  responsableId: string;
  status: MissionStatus;
  acknowledgedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  completionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  missionId: string;
  chauffeurId: string;
  chauffeurName: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  operatorResponse: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  missionId: string;
  chauffeurId: string;
  sender: MessageSender;
  senderName: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}
