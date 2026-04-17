"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { AppState, GoogleConnection, GoogleEmail, GoogleCalendarEvent } from "../types"
import { useAuth } from "../components/AuthProvider"
import {
  getGoogleConnections,
  saveGoogleConnection,
  deleteGoogleConnection,
} from "../services/firestoreService"
import {
  getGoogleAuthUrl,
  parseGoogleAuthHash,
  parseGoogleAuthError,
  clearGoogleAuthHash,
  fetchEmails,
  fetchCalendarEvents,
  groupEventsByDay,
  disconnectGoogle,
} from "../services/googleService"
import {
  Mail,
  Calendar,
  Award,
  X,
  MapPin,
  Video,
  Users,
  Reply,
  Copy,
  Check,
  Loader2,
  Send,
  Plus,
  RefreshCw,
  Trash2,
  ChevronDown,
  Inbox,
} from "lucide-react"

interface ProductivityPageProps {
  state: AppState
}

const ProductivityPage: React.FC<ProductivityPageProps> = ({ state }) => {
  const { user: firebaseUser } = useAuth()

  // Google connections
  const [connections, setConnections] = useState<GoogleConnection[]>([])
  const [loadingConnections, setLoadingConnections] = useState(true)
  const [connectingAccount, setConnectingAccount] = useState(false)

  // Emails
  const [emailsByAccount, setEmailsByAccount] = useState<Record<string, GoogleEmail[]>>({})
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [activeEmailAccount, setActiveEmailAccount] = useState<string | "all">("all")
  const [loadingEmails, setLoadingEmails] = useState(false)

  // Calendar
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([])
  const [loadingCalendar, setLoadingCalendar] = useState(false)

  // Modals
  const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null)
  const [replyingTo, setReplyingTo] = useState<GoogleEmail | null>(null)
  const [generatedReply, setGeneratedReply] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [modifyPrompt, setModifyPrompt] = useState("")
  const [copied, setCopied] = useState(false)

  // Disconnect dropdown
  const [showAccountMenu, setShowAccountMenu] = useState<string | null>(null)

  // Syncing indicator
  const [syncing, setSyncing] = useState(false)

  // ── Load connections on mount ──
  useEffect(() => {
    if (!firebaseUser) return

    const loadConnections = async () => {
      setLoadingConnections(true)
      try {
        const conns = await getGoogleConnections(firebaseUser.uid)
        const mapped: GoogleConnection[] = conns.map((c) => ({
          id: c.id,
          userId: c.userId,
          email: c.email,
          accessToken: c.accessToken,
          refreshToken: c.refreshToken,
          expiresAt: c.expiresAt,
          accountName: c.accountName,
          connectedAt: c.connectedAt,
        }))
        setConnections(mapped)
      } catch (error) {
        console.error("Failed to load Google connections:", error)
      } finally {
        setLoadingConnections(false)
      }
    }

    loadConnections()
  }, [firebaseUser])

  // ── Handle OAuth callback hash ──
  useEffect(() => {
    if (!firebaseUser) return

    const authData = parseGoogleAuthHash()
    const authError = parseGoogleAuthError()

    if (authError) {
      console.error("Google auth error:", authError)
      clearGoogleAuthHash()
      return
    }

    if (authData) {
      clearGoogleAuthHash()
      const saveAndSync = async () => {
        const docId = await saveGoogleConnection(firebaseUser.uid, authData.email, {
          userId: firebaseUser.uid,
          email: authData.email,
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          expiresAt: authData.expiresAt,
          accountName: authData.accountName,
          connectedAt: new Date().toISOString(),
        })

        const newConn: GoogleConnection = {
          id: docId,
          userId: firebaseUser.uid,
          email: authData.email,
          accessToken: authData.accessToken,
          refreshToken: authData.refreshToken,
          expiresAt: authData.expiresAt,
          accountName: authData.accountName,
          connectedAt: new Date().toISOString(),
        }

        setConnections((prev) => {
          // Replace if same email exists, otherwise add
          const existing = prev.findIndex((c) => c.email === newConn.email)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = newConn
            return updated
          }
          return [...prev, newConn]
        })
      }
      saveAndSync()
    }
  }, [firebaseUser])

  // ── Sync data when connections change ──
  const syncAllData = useCallback(async () => {
    if (connections.length === 0) {
      setEmailsByAccount({})
      setUnreadCounts({})
      setCalendarEvents([])
      return
    }

    setSyncing(true)
    setLoadingEmails(true)
    setLoadingCalendar(true)

    try {
      // Fetch emails and calendar for all accounts in parallel
      const emailResults = await Promise.allSettled(
        connections.map((conn) => fetchEmails(conn))
      )
      const calendarResults = await Promise.allSettled(
        connections.map((conn) => fetchCalendarEvents(conn))
      )

      // Process email results
      const newEmailsByAccount: Record<string, GoogleEmail[]> = {}
      const newUnreadCounts: Record<string, number> = {}

      emailResults.forEach((result, i) => {
        const email = connections[i].email
        if (result.status === "fulfilled") {
          newEmailsByAccount[email] = result.value.emails
          newUnreadCounts[email] = result.value.totalUnread
        } else {
          console.error(`Failed to fetch emails for ${email}:`, result.reason)
          newEmailsByAccount[email] = []
          newUnreadCounts[email] = 0
        }
      })

      setEmailsByAccount(newEmailsByAccount)
      setUnreadCounts(newUnreadCounts)

      // Process calendar results
      const allEvents: GoogleCalendarEvent[] = []
      calendarResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          allEvents.push(...result.value)
        } else {
          console.error(`Failed to fetch calendar for ${connections[i].email}:`, result.reason)
        }
      })

      // Deduplicate events by ID and sort
      const seenIds = new Set<string>()
      const dedupedEvents = allEvents.filter((e) => {
        if (seenIds.has(e.id)) return false
        seenIds.add(e.id)
        return true
      }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      setCalendarEvents(dedupedEvents)
    } catch (error) {
      console.error("Error syncing data:", error)
    } finally {
      setLoadingEmails(false)
      setLoadingCalendar(false)
      setSyncing(false)
    }
  }, [connections])

  useEffect(() => {
    if (connections.length > 0 && !loadingConnections) {
      syncAllData()
    }
  }, [connections, loadingConnections, syncAllData])

  // ── Handlers ──
  const handleAddAccount = () => {
    try {
      setConnectingAccount(true)
      window.location.href = getGoogleAuthUrl()
    } catch (error) {
      console.error("Failed to get Google auth URL:", error)
      setConnectingAccount(false)
    }
  }

  const handleDisconnect = async (conn: GoogleConnection) => {
    setShowAccountMenu(null)
    try {
      await disconnectGoogle(conn.accessToken)
      await deleteGoogleConnection(conn.id)
      setConnections((prev) => prev.filter((c) => c.id !== conn.id))
      setEmailsByAccount((prev) => {
        const next = { ...prev }
        delete next[conn.email]
        return next
      })
      setUnreadCounts((prev) => {
        const next = { ...prev }
        delete next[conn.email]
        return next
      })
    } catch (error) {
      console.error("Failed to disconnect:", error)
    }
  }

  const generateReply = async (email: GoogleEmail, modificationPrompt?: string) => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: email.from,
          subject: email.subject,
          brief: email.snippet,
          category: "important",
          modificationPrompt,
        }),
      })

      if (!response.ok) throw new Error("Failed to generate reply")
      const data = await response.json()
      setGeneratedReply(data.reply)
    } catch (error) {
      console.error("Error generating reply:", error)
      setGeneratedReply("Sorry, I couldn't generate a reply at this time.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleWriteReply = (email: GoogleEmail) => {
    setReplyingTo(email)
    setGeneratedReply("")
    setModifyPrompt("")
    setCopied(false)
    generateReply(email)
  }

  const handleModifyReply = () => {
    if (replyingTo && modifyPrompt.trim()) {
      generateReply(replyingTo, modifyPrompt)
      setModifyPrompt("")
    }
  }

  const handleCopyReply = () => {
    navigator.clipboard.writeText(generatedReply)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Derived data ──
  const allEmails = activeEmailAccount === "all"
    ? Object.values(emailsByAccount).flat()
    : emailsByAccount[activeEmailAccount] || []

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  const eventSections = groupEventsByDay(calendarEvents)

  const formatEventTime = (event: GoogleCalendarEvent) => {
    if (event.allDay) return "All day"
    const start = new Date(event.start)
    const end = new Date(event.end)
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  const formatEventDate = (event: GoogleCalendarEvent) => {
    const d = new Date(event.start)
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })
  }

  const formatEmailTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" })
  }

  // ── Render ──
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Productivity</h2>
          {syncing && <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />}
        </div>
        <div className="flex items-center gap-2">
          {connections.length > 0 && (
            <button
              onClick={syncAllData}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-foreground hover:bg-secondary transition-colors text-xs font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </button>
          )}
          <button
            onClick={handleAddAccount}
            disabled={connectingAccount}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-xs font-semibold disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      {/* Connected accounts strip */}
      {connections.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-shrink-0 overflow-x-auto pb-1">
          {connections.map((conn) => (
            <div key={conn.id} className="relative flex-shrink-0">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 text-xs">
                <div className="w-1.5 h-1.5 bg-primary flex-shrink-0"></div>
                <span className="text-foreground font-medium truncate max-w-[180px]">{conn.email}</span>
                <span className="text-muted-foreground">({unreadCounts[conn.email] || 0})</span>
                <button
                  onClick={() => setShowAccountMenu(showAccountMenu === conn.id ? null : conn.id)}
                  className="ml-1 p-0.5 hover:bg-primary/20 transition-colors"
                >
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
              {showAccountMenu === conn.id && (
                <div className="absolute top-full right-0 mt-1 bg-card border border-border shadow-lg z-20 min-w-[140px]">
                  <button
                    onClick={() => handleDisconnect(conn)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loadingConnections && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loadingConnections && connections.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Connect your Google accounts</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Add your Gmail or Google Workspace accounts to see your emails and calendar events in one place.
            </p>
            <button
              onClick={handleAddAccount}
              disabled={connectingAccount}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Google Account
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loadingConnections && connections.length > 0 && (
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* Left Column - Stats */}
          <div className="col-span-3 flex flex-col gap-2 min-h-0">
            {/* Task Stats */}
            <div className="bg-card p-2.5 shadow-sm border border-border flex-shrink-0">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Tasks</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Completed</span>
                  <span className="text-base font-bold text-primary">
                    {state.tasks.filter((t) => t.status === "Done").length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Pending</span>
                  <span className="text-base font-bold text-foreground">
                    {state.tasks.filter((t) => t.status === "To Do").length}
                  </span>
                </div>
                <div className="pt-1.5 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Total</span>
                    <span className="text-base font-bold text-foreground">{state.tasks.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Email Stats */}
            <div className="bg-card p-2.5 shadow-sm border border-border flex-shrink-0">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Inbox</h3>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Accounts</span>
                  <span className="text-base font-bold text-foreground">{connections.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Total Unread</span>
                  <span className="text-base font-bold text-primary">{totalUnread}</span>
                </div>
                <div className="pt-1.5 border-t border-border space-y-1">
                  {connections.map((conn) => (
                    <div key={conn.id} className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                        {conn.email.split("@")[0]}
                      </span>
                      <span className="text-xs font-bold text-foreground">{unreadCounts[conn.email] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar Stats */}
            <div className="bg-card p-2.5 shadow-sm border border-border flex-1 min-h-0">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Events</h3>
              <div className="space-y-1.5">
                {eventSections.map((section) => (
                  <div key={section.label} className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">{section.label}</span>
                    <span className="text-sm font-bold text-foreground">{section.events.length}</span>
                  </div>
                ))}
                <div className="pt-1.5 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">This Week</span>
                    <span className="text-base font-bold text-primary">{calendarEvents.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Emails */}
          <div className="col-span-5 bg-card shadow-sm border border-border p-2.5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-xs font-bold text-foreground">Unread Emails</h3>
              <Mail className="w-3.5 h-3.5 text-primary" />
            </div>

            {/* Account filter tabs */}
            {connections.length > 1 && (
              <div className="flex gap-1 mb-2 flex-shrink-0 overflow-x-auto">
                <button
                  onClick={() => setActiveEmailAccount("all")}
                  className={`px-2 py-1 text-[10px] font-medium transition-colors flex-shrink-0 ${
                    activeEmailAccount === "all"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground border border-transparent"
                  }`}
                >
                  All ({totalUnread})
                </button>
                {connections.map((conn) => (
                  <button
                    key={conn.id}
                    onClick={() => setActiveEmailAccount(conn.email)}
                    className={`px-2 py-1 text-[10px] font-medium transition-colors flex-shrink-0 truncate max-w-[120px] ${
                      activeEmailAccount === conn.email
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground border border-transparent"
                    }`}
                  >
                    {conn.email.split("@")[0]} ({unreadCounts[conn.email] || 0})
                  </button>
                ))}
              </div>
            )}

            {/* Email list */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
              {loadingEmails ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                  <p className="text-xs text-muted-foreground">Loading emails...</p>
                </div>
              ) : allEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Check className="w-8 h-8 text-primary mb-2" />
                  <p className="text-xs font-medium text-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground mt-1">No unread emails</p>
                </div>
              ) : (
                allEmails
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((email) => (
                    <div
                      key={`${email.accountEmail}-${email.id}`}
                      className="p-2 border border-border hover:border-primary/40 transition-colors flex-shrink-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-semibold text-foreground truncate max-w-[70%]">
                          {email.from}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex-shrink-0 ml-2">
                          {formatEmailTime(email.date)}
                        </span>
                      </div>
                      <h4 className="font-semibold text-[10px] text-foreground mb-0.5 truncate">{email.subject}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mb-1.5">{email.snippet}</p>
                      <div className="flex items-center justify-between">
                        {connections.length > 1 && (
                          <span className="text-[9px] text-muted-foreground truncate">
                            {email.accountEmail.split("@")[0]}
                          </span>
                        )}
                        <button
                          onClick={() => handleWriteReply(email)}
                          className="flex items-center gap-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-[9px] font-semibold transition-colors ml-auto"
                        >
                          <Reply className="w-2.5 h-2.5" />
                          <span>Write Reply</span>
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="col-span-4 bg-card shadow-sm border border-border p-2.5 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-xs font-bold text-foreground">Calendar</h3>
              <Calendar className="w-3.5 h-3.5 text-primary" />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              {loadingCalendar ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                  <p className="text-xs text-muted-foreground">Loading events...</p>
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Calendar className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No upcoming events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {eventSections.map((section) => (
                    <div key={section.label}>
                      {/* Section header */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider">
                          {section.label}
                        </h4>
                        <div className="flex-1 border-t border-border"></div>
                        <span className="text-[9px] text-muted-foreground">{section.events.length}</span>
                      </div>

                      {section.events.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground pl-2 mb-2">No events</p>
                      ) : (
                        <div className="space-y-1 mb-2">
                          {section.events.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className="w-full p-2 border border-border hover:border-primary/40 hover:bg-secondary/50 transition-colors text-left flex-shrink-0"
                            >
                              <div className="flex items-start justify-between">
                                <h4 className="font-semibold text-[10px] text-foreground truncate flex-1">
                                  {event.title}
                                </h4>
                                {section.label !== "Today" && section.label !== "Tomorrow" && (
                                  <span className="text-[9px] text-muted-foreground ml-2 flex-shrink-0">
                                    {formatEventDate(event)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[9px] text-muted-foreground">{formatEventTime(event)}</p>
                              {event.location && (
                                <div className="flex items-center mt-0.5">
                                  <MapPin className="w-2.5 h-2.5 text-muted-foreground mr-0.5" />
                                  <p className="text-[9px] text-muted-foreground truncate">{event.location}</p>
                                </div>
                              )}
                              {event.meetingLink && (
                                <div className="flex items-center mt-0.5">
                                  <Video className="w-2.5 h-2.5 text-primary mr-0.5" />
                                  <p className="text-[9px] text-primary">Video call</p>
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-card shadow-xl max-w-lg w-full p-6 relative border border-border" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 p-2 hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <h3 className="text-xl font-bold text-foreground mb-4 pr-8">{selectedEvent.title}</h3>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time</p>
                  <p className="text-foreground font-semibold">
                    {formatEventDate(selectedEvent)} &middot; {formatEventTime(selectedEvent)}
                  </p>
                </div>
              </div>

              {selectedEvent.description && (
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 flex items-center justify-center">
                    <div className="w-2 h-2 bg-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-foreground text-sm">{selectedEvent.description}</p>
                  </div>
                </div>
              )}

              {selectedEvent.location && (
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-foreground">{selectedEvent.location}</p>
                  </div>
                </div>
              )}

              {selectedEvent.meetingLink && (
                <div className="flex items-start space-x-3">
                  <Video className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Meeting Link</p>
                    <a
                      href={selectedEvent.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all text-sm"
                    >
                      {selectedEvent.meetingLink}
                    </a>
                  </div>
                </div>
              )}

              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Attendees ({selectedEvent.attendees.length})</p>
                    <div className="space-y-1 mt-1">
                      {selectedEvent.attendees.map((attendee, idx) => (
                        <p key={idx} className="text-sm text-foreground">{attendee}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedEvent.accountEmail && (
                <div className="pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">
                    From calendar: {selectedEvent.accountEmail}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full mt-6 px-4 py-3 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Email Reply Modal */}
      {replyingTo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setReplyingTo(null)}>
          <div className="bg-card shadow-xl max-w-2xl w-full p-6 relative max-h-[80vh] overflow-y-auto border border-border" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setReplyingTo(null)}
              className="absolute top-4 right-4 p-2 hover:bg-secondary transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            <h3 className="text-xl font-bold text-foreground mb-2">Reply to Email</h3>
            <div className="mb-4 p-3 bg-secondary">
              <p className="text-xs text-muted-foreground">From: {replyingTo.from}</p>
              <p className="text-sm font-semibold text-foreground">{replyingTo.subject}</p>
            </div>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <p className="text-sm text-muted-foreground">Generating reply...</p>
              </div>
            ) : generatedReply ? (
              <>
                <div className="mb-4 p-4 bg-secondary border border-border min-h-[150px]">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{generatedReply}</p>
                </div>

                <button
                  onClick={handleCopyReply}
                  className="w-full mb-4 px-4 py-3 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span>Copy Reply</span>
                    </>
                  )}
                </button>

                <div className="border-t border-border pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Modify reply:</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={modifyPrompt}
                      onChange={(e) => setModifyPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleModifyReply()}
                      placeholder="e.g., make it more formal, add a question..."
                      className="flex-1 px-3 py-2 border border-border bg-secondary text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={handleModifyReply}
                      disabled={!modifyPrompt.trim() || isGenerating}
                      className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductivityPage
