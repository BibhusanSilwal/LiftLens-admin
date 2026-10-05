import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const API_BASE_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const BACKEND_URL = `${API_BASE_URL}/users/gym/profile`;

async function proxy(request, url, method = "GET", body = null) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    ...(body && { body: JSON.stringify(body) }),
  });

  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await res.text();
    console.error("Backend error:", text);
    return NextResponse.json({ detail: "Backend error" }, { status: 500 });
  }

  return NextResponse.json(await res.json(), { status: res.status });
}

export async function GET(request) {
  return proxy(request, BACKEND_URL, "GET");
}

export async function PATCH(request) {
  const body = await request.json();
  return proxy(request, BACKEND_URL, "PATCH", body);
}
