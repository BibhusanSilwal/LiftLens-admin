import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

function addIfPresent(params, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    params.set(key, value);
  }
}

export async function GET(request) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const backendParams = new URLSearchParams();

    addIfPresent(backendParams, "days", searchParams.get("days"));
    addIfPresent(backendParams, "granularity", searchParams.get("granularity"));

    const query = backendParams.toString();
    const baseUrl = `${BACKEND_URL}/admin/users/growth-chart`.replace(/\/+$/, "");
    const url = query ? `${baseUrl}?${query}` : baseUrl;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("Proxy user growth chart GET error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
