import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const extra = (Constants.expoConfig?.extra as any)?.apiUrl as string | undefined;
  if (extra) return extra.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.protocol}//${window.location.hostname}:8000`.replace(/\/$/, '');
  }
  return 'http://localhost:8000';
}

function getApiToken(): string | undefined {
  return (process.env.EXPO_PUBLIC_API_TOKEN as string | undefined) || (Constants.expoConfig?.extra as any)?.apiToken;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getApiUrl()}${path}`;
  const token = getApiToken();
  const auth = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...auth, ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return undefined as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
