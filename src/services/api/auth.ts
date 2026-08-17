import { UserRole, UserSession, PermissionCheck } from '../../types/auth';

const STORAGE_KEY = 'nagpur_pulse_user_session';

const DEFAULT_USER: UserSession = {
  id: 'usr-cmdr-01',
  name: 'Comm. Rajesh Sharma',
  badgeOrId: 'NPG-POLICE-9081',
  role: 'POLICE_COMMANDER',
  department: 'Nagpur Police Command HQ',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
};

export function getStoredUserSession(): UserSession {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse session:', e);
  }
  return DEFAULT_USER;
}

export function saveUserSession(session: UserSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearUserSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('nagpur_pulse_auth_token');
}

export function checkPermissions(role: UserRole): PermissionCheck {
  switch (role) {
    case 'ADMIN':
    case 'POLICE_COMMANDER':
    case 'DISPATCHER':
      return {
        canDispatchPolice: true,
        canManageIncidents: true,
        canEditTrafficData: true,
        canViewTelemetry: true,
        canAccessApiDebug: true,
      };
    case 'TRAFFIC_OPERATOR':
      return {
        canDispatchPolice: false,
        canManageIncidents: true,
        canEditTrafficData: true,
        canViewTelemetry: true,
        canAccessApiDebug: true,
      };
    case 'POLICE_OFFICER':
      return {
        canDispatchPolice: false,
        canManageIncidents: true,
        canEditTrafficData: false,
        canViewTelemetry: true,
        canAccessApiDebug: false,
      };
    case 'ANALYST':
      return {
        canDispatchPolice: false,
        canManageIncidents: false,
        canEditTrafficData: false,
        canViewTelemetry: true,
        canAccessApiDebug: true,
      };
    case 'VIEWER':
    default:
      return {
        canDispatchPolice: false,
        canManageIncidents: false,
        canEditTrafficData: false,
        canViewTelemetry: false,
        canAccessApiDebug: false,
      };
  }
}
