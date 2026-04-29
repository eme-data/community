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

export class ApiError extends Error {
  status: number;
  body: any;
  constructor(message: string, status: number, body: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function readError(res: Response): Promise<{ message: string; body: any }> {
  const text = await res.text();
  if (!text) return { message: `Request failed: ${res.status}`, body: null };
  try {
    const json = JSON.parse(text);
    const msg =
      (typeof json === 'object' && (json.message || json.error)) ||
      `Request failed: ${res.status}`;
    return { message: typeof msg === 'string' ? msg : JSON.stringify(msg), body: json };
  } catch {
    return { message: text, body: null };
  }
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
    const { message, body } = await readError(res);
    throw new ApiError(message, res.status, body);
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
    const { message, body } = await readError(res);
    throw new ApiError(message, res.status, body);
  }
  return (await res.json()) as T;
}