import { NextResponse } from 'next/server';
import { getToken } from '@/app/lib/auth';
const BASE = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');
export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
  const response = await fetch(`${BASE}/today`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
}
