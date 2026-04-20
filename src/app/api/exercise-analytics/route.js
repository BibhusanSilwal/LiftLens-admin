import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

function addIfPresent(params, key, value) {
  if (value !== null && value !== undefined && value !== "") {
    params.set(key, value);
  }
}

function unauthorized() {
  return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
}

function badRequest(detail) {
  return NextResponse.json({ detail }, { status: 400 });
}

export async function GET(request) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const { searchParams } = new URL(request.url);
    const scope = (searchParams.get("scope") || "overview").toLowerCase();

    let endpoint = "";
    const backendParams = new URLSearchParams();

    if (scope === "overview") {
      endpoint = "/analytics/admin/exercises/overview/";
    } else if (scope === "top") {
      endpoint = "/analytics/admin/exercises/top/";
      addIfPresent(backendParams, "metric", searchParams.get("metric") || "sets");
      addIfPresent(backendParams, "limit", searchParams.get("limit") || "5");
      addIfPresent(backendParams, "offset", searchParams.get("offset") || "0");
    } else if (scope === "detail") {
      const exerciseId = searchParams.get("exercise_id");
      if (!exerciseId) {
        return badRequest("exercise_id is required for detail scope");
      }
      endpoint = `/analytics/admin/exercises/${exerciseId}/detail/`;
    } else if (scope === "live") {
      endpoint = "/analytics/admin/live/exercises/";
      addIfPresent(
        backendParams,
        "active_window_minutes",
        searchParams.get("active_window_minutes") || "10"
      );
      addIfPresent(backendParams, "limit", searchParams.get("limit") || "10");
    } else if (scope === "recommendations") {
      endpoint = "/exercises/recommendations/current-user";
      addIfPresent(backendParams, "limit", searchParams.get("limit") || "8");
    } else {
      return badRequest("Unsupported scope");
    }

    const query = backendParams.toString();
    const url = `${BACKEND_URL}${endpoint}${query ? `?${query}` : ""}`;

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
    console.error("Proxy exercise-analytics GET error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
