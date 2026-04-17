import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const { accessToken, timeMin, timeMax } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    if (!timeMin || !timeMax) {
      return NextResponse.json({ error: "Missing time range" }, { status: 400 })
    }

    // First get the list of calendars the user has access to
    const calListRes = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    let calendarIds: string[] = ["primary"]
    if (calListRes.ok) {
      const calListData = await calListRes.json()
      calendarIds = (calListData.items || [])
        .filter((cal: any) => cal.selected !== false)
        .map((cal: any) => cal.id)
      if (calendarIds.length === 0) calendarIds = ["primary"]
    }

    // Fetch events from all calendars in parallel
    const allEvents: any[] = []

    const eventPromises = calendarIds.map(async (calId: string) => {
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "50",
      })

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?${params}`
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (!res.ok) return []
      const data = await res.json()
      return data.items || []
    })

    const results = await Promise.all(eventPromises)
    for (const events of results) {
      allEvents.push(...events)
    }

    // Map and deduplicate by event ID
    const seenIds = new Set<string>()
    const mapped = allEvents
      .filter((event) => {
        if (!event.id || seenIds.has(event.id)) return false
        seenIds.add(event.id)
        // Skip cancelled events
        if (event.status === "cancelled") return false
        return true
      })
      .map((event) => {
        const isAllDay = !!event.start?.date && !event.start?.dateTime
        const start = event.start?.dateTime || event.start?.date || ""
        const end = event.end?.dateTime || event.end?.date || ""

        // Extract meeting link from conferenceData or description
        let meetingLink = ""
        if (event.conferenceData?.entryPoints) {
          const videoEntry = event.conferenceData.entryPoints.find((e: any) => e.entryPointType === "video")
          if (videoEntry) meetingLink = videoEntry.uri
        }
        if (!meetingLink && event.hangoutLink) {
          meetingLink = event.hangoutLink
        }

        return {
          id: event.id,
          title: event.summary || "(No title)",
          start,
          end,
          allDay: isAllDay,
          description: event.description || undefined,
          location: event.location || undefined,
          meetingLink: meetingLink || undefined,
          attendees: event.attendees
            ?.filter((a: any) => !a.self)
            ?.map((a: any) => a.email)
            ?.slice(0, 10) || undefined,
        }
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    return NextResponse.json({ events: mapped })
  } catch (error: any) {
    console.error("Error fetching calendar events:", error)
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 })
  }
}
