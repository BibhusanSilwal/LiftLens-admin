import { deleteToken } from "@/app/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request){

    const myTokenResponse = deleteToken()
    console.log(myTokenResponse)
    return NextResponse.json({},{status:200})

}