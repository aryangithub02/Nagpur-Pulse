export type ZoneCode = 'CENTRAL' | 'NORTH' | 'EAST' | 'WEST' | 'SOUTH' | 'ALL';

export type UserRole =
  | 'SYSTEM_ADMIN'
  | 'ZONE_ADMIN'
  | 'DISPATCHER'
  | 'FIELD_OFFICER'
  | 'ANALYST'
  | 'VIEWER'
  | 'ADMIN'
  | 'POLICE_COMMANDER'
  | 'TRAFFIC_OPERATOR'
  | 'POLICE_OFFICER';

export interface User {
  id: number | string;
  username: string;
  name?: string;
  badgeOrId?: string;
  department?: string;
  avatarUrl?: string;
  role: UserRole;
  zone: ZoneCode;
  zone_id?: number | null;
  is_active?: boolean;
  is_locked?: boolean;
  must_change_password?: boolean;
  password_changed_at?: string | null;
  last_login_at?: string | null;
  created_at?: string;
  badgeNumber?: string;
  unitId?: string;
  permissions?: string[];
}

export interface UserSession extends User {}

export interface PermissionCheck {
  canDispatchPolice: boolean;
  canManageIncidents: boolean;
  canEditTrafficData: boolean;
  canViewTelemetry: boolean;
  canAccessApiDebug: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  activeZone: ZoneCode;
}

export interface AuditLogItem {
  id: number;
  user_id: number | null;
  username: string;
  role: string;
  zone_code: string;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  timestamp: string;
  success: boolean;
}
