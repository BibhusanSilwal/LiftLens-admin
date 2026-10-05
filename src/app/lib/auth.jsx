const { cookies } = require("next/headers")

const TOKEN_AGE = 36000
export const TOKEN_NAME = "auth-token"
export const TOKEN_REFRESH_NAME = "auth-refresh-token"

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



export async function getUserType(){
      const myUserType = (await cookies()).get("user-type")
      return myUserType?.value
}

export async function setUserType(userType){
    return (await cookies()).set({
      name: "user-type",
      value: userType,
      httpOnly: false,
      sameSite: "strict",
      maxAge: TOKEN_AGE
    })
}

export async function getIsAdmin(){
      const myIsAdmin = (await cookies()).get("is-admin")
      return myIsAdmin?.value === "true"
}

export async function setIsAdmin(isAdmin){
    return (await cookies()).set({
      name: "is-admin",
      value: String(isAdmin),
      httpOnly: false,
      sameSite: "strict",
      maxAge: TOKEN_AGE
    })
}

export async function deleteToken(){
    // logout
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_REFRESH_NAME)
  cookieStore.delete(TOKEN_NAME)
  cookieStore.delete("user-type")
  cookieStore.delete("is-admin")

  return true
}