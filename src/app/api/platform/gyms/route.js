import { NextResponse } from 'next/server';
import { getToken } from '@/app/lib/auth';

const BASE = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

async function proxy(request) {
  const token = await getToken();
  if (!token) return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
  const search = new URL(request.url).search;
  const body = request.method === 'POST' ? await request.text() : undefined;
  const response = await fetch(`${BASE}/platform/gyms${search}`, {
    method: request.method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...(body ? { body } : {}),
  });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}

export async function GET(request) { return proxy(request); }
export async function POST(request) { return proxy(request); }
