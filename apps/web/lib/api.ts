'use client';

const BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

function token(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('community.token');
}

export function setToken(t: string | null) {
  if (typeof window === 'undefined') return;
  if (t) localStorage.setItem('community.token', t);
  else localStorage.removeItem('community.token');
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Upload a single file as multipart/form-data. */
export async function apiUpload<T = unknown>(path: string, file: File): Promise<T> {
  const headers = new Headers();
  const t = token();
  if (t) headers.set('Authorization', `Bearer ${t}`);
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: fd });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
