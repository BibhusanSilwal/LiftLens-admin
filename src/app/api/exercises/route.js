import { NextRequest, NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = "http://127.0.0.1:8000/api";

export async function GET() {
  try {
    const token = await getToken();  // Add await
    console.log("Token (GET):", token ? `${token.substring(0, 20)}...` : "null");  // Debug log (truncate for security)
    
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const res = await fetch(`${BACKEND_URL}/exercises`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy GET error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const token = await getToken();  // Add await
    console.log("Token (POST):", token ? `${token.substring(0, 20)}...` : "null");  // Debug log
    
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/exercises/`, {
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
    console.error("Proxy POST error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}