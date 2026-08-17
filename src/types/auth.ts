export type UserRole =
  | 'ADMIN'
  | 'POLICE_COMMANDER'
  | 'DISPATCHER'
  | 'POLICE_OFFICER'
  | 'TRAFFIC_OPERATOR'
  | 'ANALYST'
  | 'VIEWER';

export interface UserSession {
  id: string;
  name: string;
  badgeOrId: string;
  role: UserRole;
  token?: string;
  department: string;
  avatarUrl?: string;
}

export interface PermissionCheck {
  canDispatchPolice: boolean;
  canManageIncidents: boolean;
  canEditTrafficData: boolean;
  canViewTelemetry: boolean;
  canAccessApiDebug: boolean;
}
