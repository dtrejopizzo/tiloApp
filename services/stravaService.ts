import type { SportActivity } from "../types"
import type { FirestoreStravaConnection } from "./firestoreService"

const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize"

export function getStravaAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_STRAVA_CLIENT_ID is not configured")
  }

  const redirectUri = `${window.location.origin}/api/strava/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  })

  return `${STRAVA_AUTH_URL}?${params.toString()}`
}

export function parseStravaAuthHash(): {
  accessToken: string
  refreshToken: string
  expiresAt: number
  athleteId: number
  athleteName: string
} | null {
  if (typeof window === "undefined") return null

  const hash = window.location.hash
  if (!hash.startsWith("#strava_auth=")) return null

  try {
    const encoded = hash.replace("#strava_auth=", "")
    const json = atob(encoded)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function parseStravaErrorHash(): string | null {
  if (typeof window === "undefined") return null

  const hash = window.location.hash
  if (!hash.startsWith("#strava_error=")) return null

  return decodeURIComponent(hash.replace("#strava_error=", ""))
}

export function clearHash(): void {
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", window.location.pathname)
  }
}

interface SyncResult {
  activities: Omit<SportActivity, "id" | "userId">[]
  updatedTokens?: {
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}

export async function syncStravaActivities(
  connection: FirestoreStravaConnection,
  userWeight?: number,
): Promise<SyncResult> {
  let accessToken = connection.accessToken
  let updatedTokens: SyncResult["updatedTokens"]

  // Check token expiry with 60s buffer
  if (connection.expiresAt < Math.floor(Date.now() / 1000) + 60) {
    const refreshResponse = await fetch("/api/strava/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: connection.refreshToken }),
    })

    if (!refreshResponse.ok) {
      throw new Error("Token refresh failed — please reconnect Strava")
    }

    const newTokens = await refreshResponse.json()
    accessToken = newTokens.accessToken
    updatedTokens = {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresAt: newTokens.expiresAt,
    }
  }

  // Fetch activities from last 30 days
  const thirtyDaysAgo = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60

  const response = await fetch("/api/strava/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, after: thirtyDaysAgo, userWeight }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error || "Failed to fetch activities")
  }

  const activities = await response.json()
  return { activities, updatedTokens }
}

export async function disconnectStrava(accessToken: string): Promise<void> {
  const response = await fetch("/api/strava/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  })

  if (!response.ok) {
    throw new Error("Failed to disconnect from Strava")
  }
}
