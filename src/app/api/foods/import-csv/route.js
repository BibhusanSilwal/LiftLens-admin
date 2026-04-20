import { NextResponse } from "next/server";
import { getToken } from "@/app/lib/auth";

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const API_PREFIX = "/nutrition";

export async function POST(request) {
  try {
    const token = await getToken();
    if (!token) return unauthorized();

    const { searchParams } = new URL(request.url);
    const updateExisting = searchParams.get("update_existing") ?? "true";

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { detail: "CSV file is required" },
        { status: 400 }
      );
    }

    if (!file.name?.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { detail: "Only .csv files are allowed" },
        { status: 400 }
      );
    }

    const backendFormData = new FormData();
    backendFormData.append("file", file);

    const res = await fetch(
      `${BACKEND_URL}${API_PREFIX}/foods/import-csv?update_existing=${encodeURIComponent(updateExisting)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: backendFormData,
      }
    );

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      return NextResponse.json(
        { detail: text || "Backend error" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}

function unauthorized() {
  return NextResponse.json(
    { detail: "Authentication required" },
    { status: 401 }
  );
}
