import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

interface GmailMessage {
  id: string
  threadId: string
}

interface GmailMessageDetail {
  id: string
  snippet: string
  internalDate: string
  labelIds: string[]
  payload: {
    headers: Array<{ name: string; value: string }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const { accessToken, maxResults = 15 } = await request.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 })
    }

    // List unread messages in inbox
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("is:unread in:inbox")}&maxResults=${maxResults}`
    const listResponse = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!listResponse.ok) {
      const err = await listResponse.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.error?.message || "Failed to fetch messages" },
        { status: listResponse.status },
      )
    }

    const listData = await listResponse.json()
    const messages: GmailMessage[] = listData.messages || []

    if (messages.length === 0) {
      return NextResponse.json({ emails: [], totalUnread: 0 })
    }

    // Fetch details for each message in parallel (batch of metadata only)
    const detailPromises = messages.map(async (msg) => {
      const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      const res = await fetch(detailUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!res.ok) return null
      return res.json() as Promise<GmailMessageDetail>
    })

    const details = await Promise.all(detailPromises)

    const emails = details
      .filter((d): d is GmailMessageDetail => d !== null)
      .map((detail) => {
        const getHeader = (name: string) =>
          detail.payload.headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ""

        const fromRaw = getHeader("From")
        // Parse "Name <email>" format
        const fromMatch = fromRaw.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/)
        const from = fromMatch ? (fromMatch[1].trim() || fromMatch[2]) : fromRaw

        return {
          id: detail.id,
          from,
          subject: getHeader("Subject") || "(No subject)",
          snippet: detail.snippet || "",
          date: new Date(parseInt(detail.internalDate)).toISOString(),
          isUnread: detail.labelIds?.includes("UNREAD") ?? true,
        }
      })

    // Also get total unread count
    const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    let totalUnread = emails.length
    if (profileRes.ok) {
      const profile = await profileRes.json()
      totalUnread = profile.messagesTotal ? emails.length : emails.length // Gmail profile doesn't give unread count directly
    }

    // Get unread count from label
    const labelRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (labelRes.ok) {
      const label = await labelRes.json()
      totalUnread = label.messagesUnread || emails.length
    }

    return NextResponse.json({ emails, totalUnread })
  } catch (error: any) {
    console.error("Error fetching emails:", error)
    return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
  }
}
