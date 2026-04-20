import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const API_BASE_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

export async function GET(request) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const incomingUrl = new URL(request.url);
    const backendUrl = new URL(`${API_BASE_URL}/notifications`);

    const limit = incomingUrl.searchParams.get("limit");
    if (limit) {
      backendUrl.searchParams.set("limit", limit);
    }

    const res = await fetch(backendUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return NextResponse.json({ detail: text || "Request failed" }, { status: res.status });
  } catch (error) {
    console.error("Proxy notifications list error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
