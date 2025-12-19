import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = "http://127.0.0.1:8000/api";  // Fixed: Drop /exercises

export async function GET() {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }
    console.log("Token (GET):", token ? `${token.substring(0, 20)}...` : "null");

    const res = await fetch(`${BACKEND_URL}/exercises`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    // NEW: Check content-type before json()
    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("Django Raw Response (GET):", text.substring(0, 1000));  // Logs traceback
      return NextResponse.json(
        { detail: "Backend error: Check console for traceback", status: res.status },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy GET error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });  // FIXED: Add return
  }
}

export async function POST(request) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }
    console.log("Token (POST):", token ? `${token.substring(0, 20)}...` : "null");

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/exercises/exercises`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    // NEW: Check content-type before json()
    let data;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      console.error("Django Raw Response (POST):", text.substring(0, 1000));  // Logs traceback
      return NextResponse.json(
        { detail: "Backend error: Check console for traceback", status: res.status },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy POST error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });  // FIXED: Add return
  }
}