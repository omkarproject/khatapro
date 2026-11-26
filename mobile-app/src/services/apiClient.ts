import { ENV } from '@/config/env';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    userId?: string;
    headers?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${ENV.API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.userId ? { 'X-Auth-Session': options.userId } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { message: text };
    }

    if (!res.ok) {
      throw new ApiError(json?.message || json?.error || `Request failed (${res.status})`, res.status, json);
    }
    return json as T;
  } finally {
    clearTimeout(timer);
  }
}
