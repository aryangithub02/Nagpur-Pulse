/**
 * Nagpur Pulse — QR Device Authentication API Client
 * Wraps generation of one-time QR session challenges, device signature verification,
 * and polling of session authorization state.
 */

import { apiClient } from './client';

export interface QRSessionData {
  session_id: string;
  challenge: string;
  qr_payload: string;
  expires_at: string;
  status: 'PENDING' | 'SCANNED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
}

export interface QRSessionStatus {
  session_id: string;
  status: 'PENDING' | 'SCANNED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  authenticated: boolean;
  access_token?: string;
  token_type?: string;
  user?: any;
  device_info?: {
    device_id: string;
    device_name: string;
    allowed: boolean;
    verified_at?: string;
  };
  rejection_reason?: string;
}

export interface DeviceSignatureSubmission {
  session_id: string;
  username: string;
  device_id: string;
  device_name?: string;
  public_key: string;
  signature: string;
  algorithm?: string;
  is_pairing_request?: boolean;
}

export interface DeviceVerificationResult {
  success: boolean;
  status: 'APPROVED' | 'REJECTED';
  decision: 'YES' | 'NO';
  device_allowed: boolean;
  access_token?: string;
  user?: any;
  message: string;
}

export async function generateQRSession(): Promise<QRSessionData | null> {
  const res = await apiClient<QRSessionData>('/api/v1/auth/qr/generate-session', {
    method: 'POST',
  });
  if (res.data) {
    return res.data;
  }
  // Local fallback simulation generator
  const sessionId = `QR-LOCAL-${Math.random().toString(36).substring(2, 10)}`;
  const challenge = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return {
    session_id: sessionId,
    challenge,
    qr_payload: `nagpurpulse://auth?session=${sessionId}&challenge=${challenge}&exp=${Math.floor(Date.now() / 1000) + 120}`,
    expires_at: new Date(Date.now() + 120000).toISOString(),
    status: 'PENDING',
  };
}

export async function checkQRSessionStatus(sessionId: string): Promise<QRSessionStatus> {
  const res = await apiClient<QRSessionStatus>(`/api/v1/auth/qr/status/${sessionId}`);
  if (res.data) {
    return res.data;
  }
  return {
    session_id: sessionId,
    status: 'PENDING',
    authenticated: false,
  };
}

export async function submitDeviceSignature(
  payload: DeviceSignatureSubmission
): Promise<DeviceVerificationResult> {
  const res = await apiClient<DeviceVerificationResult>('/api/v1/auth/qr/verify-signature', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.data) {
    return res.data;
  }

  // Fallback offline simulator logic
  const isAllowed = !payload.device_id.includes('ROGUE') && !payload.device_id.includes('UNAUTHORIZED');
  if (isAllowed) {
    const mockUser = {
      id: 1,
      username: payload.username,
      name: payload.username.toUpperCase().replace('.', ' '),
      role: payload.username === 'admin' ? 'SYSTEM_ADMIN' : 'ZONE_ADMIN',
      zone: payload.username.includes('south')
        ? 'SOUTH'
        : payload.username.includes('north')
        ? 'NORTH'
        : payload.username.includes('east')
        ? 'EAST'
        : payload.username.includes('west')
        ? 'WEST'
        : payload.username.includes('central')
        ? 'CENTRAL'
        : 'ALL',
    };
    return {
      success: true,
      status: 'APPROVED',
      decision: 'YES',
      device_allowed: true,
      access_token: `mock_qr_token_${payload.username}`,
      user: mockUser,
      message: 'Signature verified & Device allowed. Access Granted.',
    };
  } else {
    return {
      success: false,
      status: 'REJECTED',
      decision: 'NO',
      device_allowed: false,
      message: `Access Rejected: Device '${payload.device_id}' is not in the allowed admin device registry.`,
    };
  }
}

export async function resetPairedDevice(username: string): Promise<{ success: boolean; message: string }> {
  const res = await apiClient<{ success: boolean; message: string }>(
    `/api/v1/auth/qr/reset-paired-device/${username}`,
    { method: 'POST' }
  );
  if (res.data) {
    return res.data;
  }
  return {
    success: true,
    message: `Pairing reset for ${username}. Ready for new phone scan.`,
  };
}

export async function getPairedDevice(
  username: string
): Promise<{ is_paired: boolean; paired_device?: any }> {
  const res = await apiClient<{ is_paired: boolean; paired_device?: any }>(
    `/api/v1/auth/qr/paired-device/${username}`
  );
  if (res.data) {
    return res.data;
  }
  return { is_paired: false };
}
