import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json()

    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refresh token" }, { status: 400 })
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errData.error_description || errData.error || "Token refresh failed" },
        { status: response.status },
      )
    }

    const data = await response.json()

    return NextResponse.json({
      accessToken: data.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
      // Google may or may not return a new refresh token
      refreshToken: data.refresh_token || refreshToken,
    })
  } catch (error: any) {
    console.error("Error refreshing Google token:", error)
    return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 })
  }
}
