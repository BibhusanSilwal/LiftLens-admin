import { NextResponse } from 'next/server';
import { getToken, getUserType, getIsAdmin } from '@/app/lib/auth';

const API_BASE_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export async function GET() {
  const token = await getToken();
  if (!token) return NextResponse.json({ detail: 'Authentication required' }, { status: 401 });
  const isAdmin = await getIsAdmin();
  const response = await fetch(`${API_BASE_URL}/me/capabilities`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  }).catch(() => null);
  const data = response ? await response.json().catch(() => ({})) : {};
  if (isAdmin) {
    // Platform admins: the backend adds who is signed in; fall back if it can't be reached.
    return NextResponse.json({ role: 'platform_admin', capabilities: ['*'], activeGym: null, user: data.user ?? null });
  }
  if (!response) return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 });
  if (!response.ok) return NextResponse.json(data, { status: response.status });
  return NextResponse.json(data);
}
