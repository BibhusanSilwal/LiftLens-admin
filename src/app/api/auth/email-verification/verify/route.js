import { NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

export async function POST(request) {
  let requestData;

  try {
    requestData = await request.json();
  } catch {
    return NextResponse.json(
      { detail: 'A valid JSON request body is required.' },
      { status: 400 }
    );
  }

  if (typeof requestData?.token !== 'string' || !requestData.token.trim()) {
    return NextResponse.json(
      { detail: 'A verification token is required.' },
      { status: 400 }
    );
  }

  let response;
  try {
    response = await fetch(`${BACKEND_URL}/auth/email-verification/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: requestData.token }),
    });
  } catch (error) {
    console.error('Email verification backend request failed:', error);
    return NextResponse.json(
      { detail: 'Unable to reach the email verification service.' },
      { status: 502 }
    );
  }

  const responseText = await response.text();
  let responseData = {};
  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { detail: responseText };
    }
  }

  return NextResponse.json(responseData, { status: response.status });
}
