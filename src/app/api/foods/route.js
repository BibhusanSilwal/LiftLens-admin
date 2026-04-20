import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const API_PREFIX = "/nutrition"; 

export async function GET() {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const res = await fetch(`${BACKEND_URL}${API_PREFIX}/foods`, {
      headers: { "Authorization": `Bearer ${token}` },
    });
    console.log(API_PREFIX)
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("GET error:", error);
    return serverError();
  }
}

export async function POST(request) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}${API_PREFIX}/foods/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("POST error:", error);
    return serverError();
  }
}

export async function PUT(request) {
  try {
    const {searchParams} = new URL(request.url);
    const token = await getToken();
    if (!token) return unauthorized();

    const id = searchParams.get(id);
    const body = await request.json();

    // Trailing slash ADDED here
    const res = await fetch(`${BACKEND_URL}${API_PREFIX}/foods/${id}/`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("PUT error:", error);
    return serverError();
  }
}

export async function DELETE(request) {
  try {
    const {searchParams} = new URL(request.url)
    const token = await getToken();
    console.log(token)
    if (!token) return unauthorized();

    const id = searchParams.get("id");

    // Trailing slash FIXED here – this was the main 404 cause
    const url = `${BACKEND_URL}${API_PREFIX}/foods/${id}/`;

    console.log(url)

    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (res.ok) {
      return NextResponse.json({ success: true });
    }

    // Debug: show Django's real response
    const text = await res.text();
    console.log("DELETE failed - Django says:", res.status, text.substring(0, 200));
    return NextResponse.json({ detail: "Failed to delete" }, { status: res.status });
  } catch (error) {
    console.error("DELETE error:", error);
    return serverError();
  }
}

// Helpers
function unauthorized() {
  return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
}

function serverError() {
  return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
}