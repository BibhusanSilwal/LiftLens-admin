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
    const userId = searchParams.get("user_id");
    const type = (searchParams.get("type") || "overview").toLowerCase();

    if (!userId) {
      return NextResponse.json({ detail: "user_id is required" }, { status: 400 });
    }

    let endpoint = "";
    const backendParams = new URLSearchParams();

    if (type === "workout-history") {
      endpoint = `/analytics/users/${userId}/workout-history/`;
      addIfPresent(backendParams, "limit", searchParams.get("limit") || "20");
      addIfPresent(backendParams, "offset", searchParams.get("offset") || "0");
      addIfPresent(backendParams, "from_date", searchParams.get("from_date"));
      addIfPresent(backendParams, "to_date", searchParams.get("to_date"));
      addIfPresent(backendParams, "exercise_name", searchParams.get("exercise_name"));
    } else if (type === "food-history") {
      endpoint = `/analytics/users/${userId}/food-history/`;
      addIfPresent(backendParams, "limit", searchParams.get("limit") || "15");
      addIfPresent(backendParams, "offset", searchParams.get("offset") || "0");
      addIfPresent(backendParams, "from_date", searchParams.get("from_date"));
      addIfPresent(backendParams, "to_date", searchParams.get("to_date"));
      addIfPresent(backendParams, "food_name", searchParams.get("food_name"));
    } else {
      endpoint = `/analytics/users/${userId}/overview/`;
      addIfPresent(backendParams, "from_date", searchParams.get("from_date"));
      addIfPresent(backendParams, "to_date", searchParams.get("to_date"));
      addIfPresent(backendParams, "timeline_limit", searchParams.get("timeline_limit") || "25");
      addIfPresent(backendParams, "timeline_offset", searchParams.get("timeline_offset") || "0");
      addIfPresent(backendParams, "event_type", searchParams.get("event_type"));
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
    console.error("Proxy user-analytics GET error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}