import { NextResponse } from 'next/server';
import { getToken } from '@/app/lib/auth';

const BASE = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

async function proxy(request, { params }) {
  const token = await getToken();
  if (!token) return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
  const { id } = await params;
  const body = request.method === 'DELETE' ? undefined : await request.text();
  const response = await fetch(`${BASE}/platform/gyms/${encodeURIComponent(id)}`, {
    method: request.method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body } : {}),
  });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}

export async function PATCH(request, context) { return proxy(request, context); }
export async function DELETE(request, context) { return proxy(request, context); }
