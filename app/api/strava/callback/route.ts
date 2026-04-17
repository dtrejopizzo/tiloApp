import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  const baseUrl = new URL(req.url).origin

  if (error || !code) {
    const msg = error || "No authorization code received"
    return NextResponse.redirect(`${baseUrl}/sports#strava_error=${encodeURIComponent(msg)}`)
  }

  try {
    const tokenResponse = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json().catch(() => ({}))
      const msg = errData.message || "Token exchange failed"
      return NextResponse.redirect(`${baseUrl}/sports#strava_error=${encodeURIComponent(msg)}`)
    }

    const data = await tokenResponse.json()

    const authData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      athleteId: data.athlete?.id,
      athleteName: `${data.athlete?.firstname || ""} ${data.athlete?.lastname || ""}`.trim() || "Athlete",
    }

    const encoded = Buffer.from(JSON.stringify(authData)).toString("base64url")
    return NextResponse.redirect(`${baseUrl}/sports#strava_auth=${encoded}`)
  } catch (err: any) {
    const msg = err.message || "Unexpected error during Strava authentication"
    return NextResponse.redirect(`${baseUrl}/sports#strava_error=${encodeURIComponent(msg)}`)
  }
}
