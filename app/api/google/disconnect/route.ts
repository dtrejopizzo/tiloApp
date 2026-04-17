import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    // Revoke the token at Google
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })

    // Even if revocation fails (e.g., token already expired), we still consider disconnect successful
    // since the client will delete the Firestore record
    if (!response.ok) {
      console.warn("Google token revocation returned non-OK status:", response.status)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error disconnecting Google:", error)
    // Still return success since the client will clean up Firestore
    return NextResponse.json({ success: true })
  }
}
