import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const API_BASE_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

export async function POST(request) {
  try {
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    }

    const incomingUrl = new URL(request.url);
    const userId = incomingUrl.searchParams.get("user_id")?.trim();

    const payload = await request.json();
    const requestedMode = payload?.mode;
    const mode = requestedMode || (userId ? "single" : "all");

    if (mode !== "single" && mode !== "all") {
      return NextResponse.json(
        { detail: "mode must be either 'single' or 'all'" },
        { status: 422 }
      );
    }

    if (mode === "single" && !userId) {
      return NextResponse.json(
        { detail: "user_id query param is required when mode is 'single'" },
        { status: 400 }
      );
    }

    if (mode === "all" && userId) {
      return NextResponse.json(
        { detail: "user_id query param must not be provided when mode is 'all'" },
        { status: 400 }
      );
    }

    const normalizedPayload = {
      ...payload,
      mode,
    };

    const backendUrl = new URL(`${API_BASE_URL}/notifications/send`);
    if (userId) {
      backendUrl.searchParams.set("user_id", userId);
    }

    const res = await fetch(backendUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(normalizedPayload),
    });

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    const text = await res.text();
    return NextResponse.json({ detail: text || "Request failed" }, { status: res.status });
  } catch (error) {
    console.error("Proxy notification send error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
