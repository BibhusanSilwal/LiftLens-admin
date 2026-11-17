import type { components } from '../../generated/joins-api';

export type JoinCode = components['schemas']['JoinCode'];
export type JoinCodeList = components['schemas']['JoinCodeList'];
export type JoinCodeRequest = components['schemas']['JoinCodeRequest'];
export type JoinResolve = components['schemas']['JoinResolve'];
export type JoinClaim = components['schemas']['JoinClaim'];
export type ApiError = components['schemas']['Error'];

export async function joinsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = body as ApiError | null;
    const typedError = new Error(error?.message || 'Request failed') as Error & { code?: string; details?: Record<string, never> | null };
    typedError.code = error?.code;
    typedError.details = error?.details;
    throw typedError;
  }
  return body as T;
}

export function listJoinCodes(gymId: number, page = 1, pageSize = 20) {
  return joinsRequest<JoinCodeList>(`/api/v1/gyms/${gymId}/join-codes?page=${page}&page_size=${pageSize}`);
}

export function createJoinCode(gymId: number, body: JoinCodeRequest) {
  return joinsRequest<JoinCode>(`/api/v1/gyms/${gymId}/join-codes`, { method: 'POST', body: JSON.stringify(body) });
}

export function revokeJoinCode(gymId: number, codeId: number) {
  return joinsRequest<JoinCode>(`/api/v1/gyms/${gymId}/join-codes/${codeId}/revoke`, { method: 'POST' });
}

export function regenerateJoinCode(gymId: number, codeId: number) {
  return joinsRequest<JoinCode>(`/api/v1/gyms/${gymId}/join-codes/${codeId}/regenerate`, { method: 'POST' });
}
