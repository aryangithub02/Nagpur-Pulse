export const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost')) {
    return envUrl;
  }
  if (
    typeof window !== 'undefined' &&
    (window.location.hostname.includes('vercel.app') ||
      window.location.hostname.includes('onrender.com') ||
      window.location.protocol === 'https:')
  ) {
    return 'https://nagpur-pulse-backend.onrender.com';
  }
  return envUrl || 'http://localhost:8000';
};

const API_BASE_URL = getBaseUrl();

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('nagpur_pulse_auth_token');
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown server error');
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      try {
        const jsonErr = JSON.parse(errorText);
        if (jsonErr.detail) {
          errorMessage = typeof jsonErr.detail === 'string' ? jsonErr.detail : JSON.stringify(jsonErr.detail);
        }
      } catch {
        // ignore
      }
      return { data: null, error: errorMessage, status: response.status };
    }

    const data = (await response.json()) as T;
    return { data, error: null, status: response.status };
  } catch (err: any) {
    const errorMsg = err?.message || 'Network request failed. Backend API server might be offline.';
    return { data: null, error: errorMsg, status: 0 };
  }
}
