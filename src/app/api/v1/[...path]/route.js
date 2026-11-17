import { NextResponse } from 'next/server';
import { getToken } from '@/app/lib/auth';

const API_BASE_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export async function GET(request, context) { return proxy(request, context); }
export async function POST(request, context) { return proxy(request, context); }
export async function PUT(request, context) { return proxy(request, context); }
export async function PATCH(request, context) { return proxy(request, context); }
export async function DELETE(request, context) { return proxy(request, context); }

async function proxy(request, context) {
  const token = await getToken();
  const { path } = await context.params;
  const target = `${API_BASE_URL}/v1/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`;
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.text() : undefined;
  const response = await fetch(target, {
    method: request.method,
    headers,
    cache: 'no-store',
    ...(body ? { body } : {}),
  });
  const text = await response.text();
  return new NextResponse(response.status === 204 ? null : text, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
  });
}
