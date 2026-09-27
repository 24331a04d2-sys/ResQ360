export type UserRole = 'citizen' | 'responder' | 'admin';

export type EmergencyType =
  | 'Medical Emergency'
  | 'Fire Outbreak'
  | 'Flood & Inundation'
  | 'Cyclone / Storm'
  | 'Building Collapse'
  | 'Vehicle Accident'
  | 'Landslide / Mudflow'
  | 'Earthquake Impact'
  | 'Missing Person'
  | 'Water Contamination'
  | 'Hazardous Chemical'
  | 'Other Threat';

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentStatus =
  | 'reported'
  | 'ai_analyzed'
  | 'verified'
  | 'acknowledged'
  | 'assigned'
  | 'dispatched'
  | 'en_route'
  | 'arrived'
  | 'resolved'
  | 'cancelled';

export type ResponderAvailability = 'available' | 'assigned' | 'en_route' | 'on_scene' | 'offline';

export type TeamStatus = 'available' | 'dispatched' | 'responding' | 'busy' | 'resting' | 'maintenance' | 'offline';

export type ResourceStatus = 'adequate' | 'low' | 'critical';

export interface UserProfile {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  badgeNumber?: string;
  teamType?: string;
  responderProfileId?: string;
  active: boolean;
  notificationPreferences?: {
    criticalAlerts?: boolean;
    statusUpdates?: boolean;
    weatherAdvisories?: boolean;
  };
  createdAt: any;
  updatedAt: any;
  lastActiveAt?: any;
}

export interface AiAssessment {
  priorityScore: number;
  priorityLevel: SeverityLevel;
  reasoning: string;
  riskFactors: string[];
  peopleAtRisk: number;
  suggestedTeams: string[];
  suggestedResources: string[];
  recommendedActions: string[];
  safetyPrecautions: string[];
  modelUsed: string;
  timestamp: string;
  status: 'completed' | 'fallback';
}

export interface StatusHistoryItem {
  id?: string;
  status: IncidentStatus;
  timestamp: any;
  updatedByUid: string;
  updatedByName: string;
  updatedByRole: string;
  note?: string;
}

export interface Incident {
  id: string;
  incidentId: string; // e.g. "RESQ-1047"
  citizenId: string; // auth UID or "guest"
  citizenName: string;
  citizenPhone?: string;
  type: EmergencyType;
  description: string;
  affectedPeople: number;
  isAnyoneInjured: boolean;
  isAnyoneTrapped: boolean;
  isImmediateDanger: boolean;
  severity: SeverityLevel;
  severityScore: number;
  severityFactors: string[];
  aiAssessment?: AiAssessment;
  verifiedByAdmin: boolean;
  verifiedAt?: any;
  verifiedByUid?: string;
  verifiedByName?: string;
  latitude: number;
  longitude: number;
  locationAddress: string;
  locationAccuracy?: number | null;
  photoStoragePath?: string | null;
  photoMetadata?: {
    contentType?: string;
    size?: number;
    uploadedAt?: string;
  } | null;
  status: IncidentStatus;
  assignedResponderId?: string | null;
  assignedResponderName?: string | null;
  assignedResponderTeam?: string | null;
  assignedTeamId?: string | null;
  assignedTeamName?: string | null;
  isGuestReport: boolean;
  guestAccessTokenHash?: string | null;
  isDemo?: boolean;
  createdAt: any;
  updatedAt: any;
  resolvedAt?: any;
}

export interface Team {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  status: TeamStatus;
  currentIncidentId?: string | null;
  currentIncidentCode?: string | null;
  contact: string;
  station: string;
  baseLocation: string;
  vehicles: string;
  equipment: string;
  isDemo?: boolean;
  updatedAt: any;
}

export interface Responder {
  responderId: string;
  userId: string;
  name: string;
  phone: string;
  email: string;
  badgeNumber: string;
  teamType: string;
  teamId?: string | null;
  availability: ResponderAvailability;
  currentIncidentId?: string | null;
  currentIncidentCode?: string | null;
  lastActiveAt?: any;
  location?: string;
  isDemo?: boolean;
}

export interface EmergencyResource {
  id: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  allocatedQuantity: number;
  unit: string;
  status: ResourceStatus;
  location: string;
  isDemo?: boolean;
  updatedAt: any;
}

export interface NotificationItem {
  id: string;
  userId?: string;
  role?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical' | 'success';
  read: boolean;
  timestamp: any;
  relatedIncidentId?: string;
  relatedIncidentCode?: string;
}

export interface AuditLogEntry {
  id?: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  targetCode?: string;
  previousValue?: string;
  newValue?: string;
  details?: string;
  timestamp: any;
}

export interface AdminStats {
  totalIncidents: number;
  activeEmergencies: number;
  criticalEmergencies: number;
  highEmergencies: number;
  awaitingVerification: number;
  activeResponses: number;
  availableResponders: number;
  availableTeams: number;
  availableResources: number;
  resolvedToday: number;
}
