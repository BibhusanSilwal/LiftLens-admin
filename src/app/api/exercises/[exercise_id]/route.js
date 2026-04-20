import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

function unauthorized() {
  return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
}

function serverError() {
  return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
}

async function proxyExerciseRequest(request, ctx, method) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const routeParams = await ctx?.params;
    const exerciseId = routeParams?.exercise_id;
    if (!exerciseId) {
      return NextResponse.json({ detail: "exercise_id is required" }, { status: 400 });
    }

    const init = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };

    if (method === "PATCH") {
      const body = await request.json();
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await fetch(`${BACKEND_URL}/exercises/${exerciseId}/`, init);
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
    console.error(`Exercise ${method} proxy error:`, error);
    return serverError();
  }
}

export async function GET(request, context) {
  return proxyExerciseRequest(request, context, "GET");
}

export async function PATCH(request, context) {
  return proxyExerciseRequest(request, context, "PATCH");
}

export async function DELETE(request, context) {
  return proxyExerciseRequest(request, context, "DELETE");
}
