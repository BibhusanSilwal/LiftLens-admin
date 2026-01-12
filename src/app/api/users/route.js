import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = "http://127.0.0.1:8000/api/admin/users";

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

/* =======================
   GET: users + stats
   ======================= */
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("stats")) {
    return proxy(request, `${BACKEND_URL}/stats`);
  }

  return proxy(request, `${BACKEND_URL}?${searchParams.toString()}`);
}

/* =======================
   POST: create user
   ======================= */
export async function POST(request) {
  const body = await request.json();
  return proxy(request, BACKEND_URL, "POST", body);
}

/* =======================
   PATCH: update user
   ======================= */
export async function PATCH(request) {
  const body = await request.json();
  return proxy(request, `${BACKEND_URL}/${body.id}`, "PATCH", body);
}

/* =======================
   DELETE: single & bulk
   ======================= */
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);

  // Single delete
  if (searchParams.get("id")) {
    return proxy(request, `${BACKEND_URL}/${searchParams.get("id")}`, "DELETE");
  }

  // Bulk delete
  const body = await request.json();
  return proxy(request, `${BACKEND_URL}/bulk-delete`, "POST", body);
}
