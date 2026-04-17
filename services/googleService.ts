import type { GoogleConnection, GoogleEmail, GoogleCalendarEvent } from "../types"
import { updateGoogleConnection } from "./firestoreService"

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ")

export function getGoogleAuthUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured")
  }

  const redirectUri = `${window.location.origin}/api/google/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent select_account",
  })

  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export function parseGoogleAuthHash(): {
  accessToken: string
  refreshToken: string
  expiresAt: number
  email: string
  accountName: string
} | null {
  if (typeof window === "undefined") return null

  const hash = window.location.hash
  const match = hash.match(/google_auth=([^&]+)/)
  if (!match) return null

  try {
    const decoded = atob(match[1].replace(/-/g, "+").replace(/_/g, "/"))
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

export function parseGoogleAuthError(): string | null {
  if (typeof window === "undefined") return null

  const hash = window.location.hash
  const match = hash.match(/google_error=([^&]+)/)
  if (!match) return null

  return decodeURIComponent(match[1])
}

export function clearGoogleAuthHash(): void {
  if (typeof window === "undefined") return
  // Remove google_auth or google_error from hash, keep other hash params
  const hash = window.location.hash
    .replace(/#?google_auth=[^&]*&?/, "")
    .replace(/#?google_error=[^&]*&?/, "")
    .replace(/^#?&?/, "")
  window.history.replaceState(null, "", hash ? `#${hash}` : window.location.pathname)
}

/**
 * Ensures the access token is valid. If expired, refreshes it and updates Firestore.
 */
async function ensureValidToken(connection: GoogleConnection): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  // Refresh if token expires within 60 seconds
  if (connection.expiresAt > now + 60) {
    return connection.accessToken
  }

  const response = await fetch("/api/google/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: connection.refreshToken }),
  })

  if (!response.ok) {
    throw new Error("Failed to refresh Google token")
  }

  const data = await response.json()

  // Update Firestore with new tokens
  await updateGoogleConnection(connection.id, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
  })

  // Update the connection object in-place for the caller
  connection.accessToken = data.accessToken
  connection.refreshToken = data.refreshToken
  connection.expiresAt = data.expiresAt

  return data.accessToken
}

/**
 * Fetch unread emails for a Google connection.
 */
export async function fetchEmails(
  connection: GoogleConnection,
): Promise<{ emails: GoogleEmail[]; totalUnread: number }> {
  const accessToken = await ensureValidToken(connection)

  const response = await fetch("/api/google/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, maxResults: 15 }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || "Failed to fetch emails")
  }

  const data = await response.json()

  // Tag each email with the account it came from
  const emails: GoogleEmail[] = (data.emails || []).map((e: any) => ({
    ...e,
    accountEmail: connection.email,
  }))

  return { emails, totalUnread: data.totalUnread || emails.length }
}

/**
 * Fetch calendar events for a Google connection.
 */
export async function fetchCalendarEvents(
  connection: GoogleConnection,
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await ensureValidToken(connection)

  const { timeMin, timeMax } = getCalendarTimeRange()

  const response = await fetch("/api/google/calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, timeMin, timeMax }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || "Failed to fetch calendar events")
  }

  const data = await response.json()

  // Tag each event with the account it came from
  return (data.events || []).map((e: any) => ({
    ...e,
    accountEmail: connection.email,
  }))
}

/**
 * Disconnect a Google account.
 */
export async function disconnectGoogle(accessToken: string): Promise<void> {
  await fetch("/api/google/disconnect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  })
}

/**
 * Calculate the time range for calendar events based on the current day.
 *
 * Mon-Thu: Today through end of Sunday
 * Fri-Sun: Today through end of next Sunday
 */
export function getCalendarTimeRange(): { timeMin: string; timeMax: string } {
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  let endDate: Date

  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Mon-Thu: through end of this Sunday
    const daysUntilSunday = 7 - dayOfWeek
    endDate = new Date(startOfDay)
    endDate.setDate(endDate.getDate() + daysUntilSunday)
    endDate.setHours(23, 59, 59, 999)
  } else {
    // Fri, Sat, Sun: through end of NEXT Sunday
    const daysUntilNextSunday = dayOfWeek === 0 ? 7 : (14 - dayOfWeek)
    endDate = new Date(startOfDay)
    endDate.setDate(endDate.getDate() + daysUntilNextSunday)
    endDate.setHours(23, 59, 59, 999)
  }

  return {
    timeMin: startOfDay.toISOString(),
    timeMax: endDate.toISOString(),
  }
}

/**
 * Group calendar events into smart day sections.
 *
 * Mon-Thu: Today | Tomorrow | Rest of Week
 * Fri: Today | Monday | Next Week
 * Sat-Sun: Today | Monday | Next Week
 */
export function groupEventsByDay(events: GoogleCalendarEvent[]): {
  label: string
  date: string // YYYY-MM-DD for the section
  events: GoogleCalendarEvent[]
}[] {
  const now = new Date()
  const today = toDateString(now)

  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toDateString(tomorrow)

  const dayOfWeek = now.getDay()

  // Group events by their date
  const byDate: Record<string, GoogleCalendarEvent[]> = {}
  for (const event of events) {
    const eventDate = toDateString(new Date(event.start))
    if (!byDate[eventDate]) byDate[eventDate] = []
    byDate[eventDate].push(event)
  }

  const sections: { label: string; date: string; events: GoogleCalendarEvent[] }[] = []

  // Always add Today
  sections.push({
    label: "Today",
    date: today,
    events: byDate[today] || [],
  })

  if (dayOfWeek >= 1 && dayOfWeek <= 4) {
    // Mon-Thu: Tomorrow, then Rest of Week
    sections.push({
      label: "Tomorrow",
      date: tomorrowStr,
      events: byDate[tomorrowStr] || [],
    })

    // Rest of week: from day after tomorrow through Sunday
    const restEvents: GoogleCalendarEvent[] = []
    const dayAfterTomorrow = new Date(now)
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
    const endOfWeek = new Date(now)
    endOfWeek.setDate(endOfWeek.getDate() + (7 - dayOfWeek))

    for (const [dateStr, evts] of Object.entries(byDate)) {
      const d = new Date(dateStr + "T00:00:00")
      if (d >= dayAfterTomorrow && d <= endOfWeek) {
        restEvents.push(...evts)
      }
    }

    if (restEvents.length > 0) {
      sections.push({
        label: "Rest of Week",
        date: "",
        events: restEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
      })
    }
  } else {
    // Fri/Sat/Sun: show Monday, then Next Week
    // Find next Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek)
    const monday = new Date(now)
    monday.setDate(monday.getDate() + daysUntilMonday)
    const mondayStr = toDateString(monday)

    // If tomorrow isn't Monday, show Tomorrow first
    if (tomorrowStr !== mondayStr) {
      sections.push({
        label: "Tomorrow",
        date: tomorrowStr,
        events: byDate[tomorrowStr] || [],
      })
    }

    sections.push({
      label: "Monday",
      date: mondayStr,
      events: byDate[mondayStr] || [],
    })

    // Next week (Tue-Sun after Monday)
    const nextWeekEvents: GoogleCalendarEvent[] = []
    const tuesday = new Date(monday)
    tuesday.setDate(tuesday.getDate() + 1)
    const nextSunday = new Date(monday)
    nextSunday.setDate(nextSunday.getDate() + 6)

    for (const [dateStr, evts] of Object.entries(byDate)) {
      const d = new Date(dateStr + "T00:00:00")
      if (d >= tuesday && d <= nextSunday) {
        nextWeekEvents.push(...evts)
      }
    }

    if (nextWeekEvents.length > 0) {
      sections.push({
        label: "Next Week",
        date: "",
        events: nextWeekEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
      })
    }
  }

  return sections
}

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0]
}
