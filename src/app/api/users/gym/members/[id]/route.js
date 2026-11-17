import { NextResponse } from 'next/server';
import { getToken } from '@/app/lib/auth';

const BASE = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export async function GET(request, { params }) {
  const token = await getToken();
  if (!token) return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
  const { id } = await params;
  const response = await fetch(`${BASE}/users/gym/members/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}
