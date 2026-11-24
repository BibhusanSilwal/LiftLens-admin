import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

// The cuisines and categories in use, for the Food page filters.
export async function GET() {
  try {
    const token = await getToken();
    if (!token) return NextResponse.json({ detail: "Authentication required" }, { status: 401 });
    const res = await fetch(`${BACKEND_URL}/nutrition/foods/facets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch (error) {
    console.error("GET food facets error:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
