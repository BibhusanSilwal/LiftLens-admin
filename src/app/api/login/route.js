"use server"
import { setRefreshToken, setToken, setUserType, setIsAdmin } from "@/app/lib/auth"
import { NextResponse } from "next/server"
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "")
const DJANGO_LOGIN_URL = `${BACKEND_URL}/auth/login/`

export async function POST(request) {
  const requestData = await request.json()

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestData) // Stringify the parsed data
  }
  // Fetch to Django. Some error responses may have no body or may not be JSON.
  let response
  try {
    response = await fetch(DJANGO_LOGIN_URL, requestOptions)
  } catch (error) {
    console.error("Login backend request failed:", error)
    return NextResponse.json(
      { success: false, message: "Unable to reach the login service" },
      { status: 502 }
    )
  }

  let responseData = {}
  const responseText = await response.text()
  if (responseText) {
    try {
      responseData = JSON.parse(responseText)
    } catch {
      console.error("Login backend returned a non-JSON response")
    }
  }
  const { access, refresh, is_admin, user_type, gym_access } = responseData

  // Create response
  const nextResponse = NextResponse.json(
    {
      success: response.ok,
      message: response.ok
        ? "Login successful"
        : responseData.detail || responseData.message || "Login failed",
      token: access,  // Include token for client if needed (but it's in cookie)
      is_admin: is_admin,
      user_type: user_type,
      gym_access: Boolean(gym_access)
    },
    { status: response.ok ? 200 : 401 }
  )
  if (response.ok && access) {
    // Persist the session cookies before returning the successful login response.
    await setToken(access)
    if (refresh) await setRefreshToken(refresh)
    // Staff accounts are ordinary users with gym access; the dashboard gate only needs to know it's gym-side.
    await setUserType(gym_access && !is_admin ? "gym" : user_type || "")
    await setIsAdmin(is_admin || false)
  }
  if (response.ok && !access) {
    return NextResponse.json(
      { success: false, message: "Login service returned an incomplete response" },
      { status: 502 }
    )
  }
  return nextResponse
}
