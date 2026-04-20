import { deleteToken, TOKEN_NAME, TOKEN_REFRESH_NAME } from "@/app/lib/auth";
import { NextResponse } from "next/server";

export async function POST(){
        await deleteToken();

        const response = NextResponse.json({}, { status: 200 });
        response.cookies.set(TOKEN_NAME, "", {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 0,
            path: "/",
        });
        response.cookies.set(TOKEN_REFRESH_NAME, "", {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 0,
            path: "/",
        });

        return response;
}