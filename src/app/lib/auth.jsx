const { cookies } = require("next/headers")

const TOKEN_AGE = 3600
const TOKEN_NAME = "auth-token"
const TOKEN_REFRESH_NAME = "auth-refresh-token"

export async function getToken(){
      const myAuthToken = (await cookies()).get(TOKEN_NAME)
      return myAuthToken?.value
}

export async function getRefreshToken(){
      const myAuthToken = (await cookies()).get(TOKEN_REFRESH_NAME) 
      return myAuthToken?.value
}

export async function setToken(authToken){
    // login
    return (await cookies()).set({
      name: TOKEN_NAME,
      value: authToken,
      httpOnly: true, // Limits client-side JS access
      sameSite: "strict",
      maxAge: TOKEN_AGE // 1 hour
    })
}

export async function setRefreshToken(authRefreshToken){
    // login
    return (await cookies()).set({
      name: TOKEN_REFRESH_NAME,
      value: authRefreshToken,
      httpOnly: true, // Limits client-side JS access
      sameSite: "strict",
      maxAge: TOKEN_AGE // 1 hour
    })
}



export async function deleteToken(){
    // logout

    (await cookies()).delete(TOKEN_REFRESH_NAME)
      return (await cookies()).delete(TOKEN_NAME)
}