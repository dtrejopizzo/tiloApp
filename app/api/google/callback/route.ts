import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  const baseUrl = new URL(req.url).origin

  if (error || !code) {
    const msg = error || "No authorization code received"
    return NextResponse.redirect(`${baseUrl}/#google_error=${encodeURIComponent(msg)}`)
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: `${baseUrl}/api/google/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}))
      const msg = errData.error_description || errData.error || "Token exchange failed"
      return NextResponse.redirect(`${baseUrl}/#google_error=${encodeURIComponent(msg)}`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info (email + name) using the access token
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })

    let email = ""
    let accountName = ""

    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json()
      email = userInfo.email || ""
      accountName = userInfo.name || userInfo.email || ""
    }

    const authData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
      email,
      accountName,
    }

    const encoded = Buffer.from(JSON.stringify(authData)).toString("base64url")
    return NextResponse.redirect(`${baseUrl}/#google_auth=${encoded}`)
  } catch (err: any) {
    const msg = err.message || "Unexpected error during Google authentication"
    return NextResponse.redirect(`${baseUrl}/#google_error=${encodeURIComponent(msg)}`)
  }
}
