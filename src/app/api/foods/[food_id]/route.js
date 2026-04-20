import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const API_PREFIX = "/nutrition";

function unauthorized() {
  return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
}

function serverError() {
  return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
}

export async function PATCH(request, context) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const params = await context?.params;
    const foodId = params?.food_id;
    if (!foodId) {
      return NextResponse.json({ detail: "food_id is required" }, { status: 400 });
    }

    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};

    const res = await fetch(`${BACKEND_URL}${API_PREFIX}/foods/${foodId}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { detail: text };
      }
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("PATCH food proxy error:", error);
    return serverError();
  }
}
