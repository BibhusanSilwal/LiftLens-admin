"use server"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request) {
  console.log("request", request) 
  const data = await request.json()

  const authToken = (await cookies()).get("auth-token") 


  const response = NextResponse.json(
    { hello: "world", cookie: authToken?.value }, // Use .value to get the string
    { status: 200 }
  )

  response.cookies.set({
    name: "authToken",
    value: "abc",
    httpOnly: true, // Limits client-side JS access
    sameSite: "strict",
    maxAge: 3600, // 1 hour
  })

  console.log(data)
  return response
}