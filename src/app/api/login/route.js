"use server"
import { getRefreshToken, getToken, setRefreshToken, setToken } from "@/app/lib/auth"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
// const DJANGO_LOGIN_URL = "http://127.0.0.1:8000/api/token/pair"
const DJANGO_LOGIN_URL = "http://127.0.0.1:8000/api/auth/login/"

export async function POST(request) {
  const myAuthToken = getToken()
  const myRefreshToken = getRefreshToken()
  console.log(myAuthToken, myRefreshToken)
  const requestData = await request.json()
  console.log("requestData", JSON.stringify(requestData)) // Log for debugging

  const requestOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestData) // Stringify the parsed data
  }
  // Fetch to Django
  const response = await fetch(DJANGO_LOGIN_URL, requestOptions)
  const responseData = await response.json()
  const { access, refresh, is_admin } = responseData  // New: Extract is_admin

  // Create response
  const nextResponse = NextResponse.json(
    {
      success: response.ok,
      message: response.ok ? "Login successful" : "Login failed",
      token: access,  // Include token for client if needed (but it's in cookie)
      is_admin: is_admin  // New: Pass role to client
    },
    { status: response.ok ? 200 : 401 }
  )
  if (response.ok) {
    // Set cookie on the response (not via cookies().set())
    setToken(access)
    setRefreshToken(refresh)
  }
  return nextResponse
}