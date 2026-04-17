"use client"

import type React from "react"
import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import type { AppState, SportActivity } from "../types"
import { Icons } from "../constants"
import { getTodayDateString } from "../lib/dateUtils"
import { useAuth } from "../components/AuthProvider"
import {
  getStravaConnection,
  saveStravaConnection,
  deleteStravaConnection,
  addSportActivity,
  getSportActivities,
  type FirestoreStravaConnection,
} from "../services/firestoreService"
import {
  getStravaAuthUrl,
  parseStravaAuthHash,
  parseStravaErrorHash,
  clearHash,
  syncStravaActivities,
  disconnectStrava,
} from "../services/stravaService"

interface SportsPageProps {
  state: AppState
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void
  onActivitiesReload?: (activities: SportActivity[]) => void
}

const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  Run: "\u{1F3C3}",
  Swim: "\u{1F3CA}",
  Cycle: "\u{1F6B4}",
  Walk: "\u{1F6B6}",
  Hike: "\u{26F0}\uFE0F",
  Tennis: "\u{1F3BE}",
  Strength: "\u{1F4AA}",
  Other: "\u{26A1}",
}

const SportsPage: React.FC<SportsPageProps> = ({ state, updateState, onActivitiesReload }) => {
  const { user: firebaseUser } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [stravaConnection, setStravaConnection] = useState<FirestoreStravaConnection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newActivity, setNewActivity] = useState<Partial<SportActivity>>({
    type: "Strength",
    name: "",
    duration: 30,
    date: getTodayDateString(),
  })

  const userId = firebaseUser?.uid || state.user?.id
  const syncingRef = useRef(false)

  const handleSync = useCallback(
    async (conn?: FirestoreStravaConnection) => {
      const connection = conn || stravaConnection
      if (!connection || !userId || syncingRef.current) return

      syncingRef.current = true
      setIsSyncing(true)
      setError(null)

      try {
        const { activities: stravaActivities, updatedTokens } = await syncStravaActivities(
          connection,
          state.user?.weight,
        )

        // Save updated tokens if refreshed
        if (updatedTokens) {
          const updatedConn = { ...connection, ...updatedTokens }
          await saveStravaConnection(userId, updatedConn)
          setStravaConnection(updatedConn)
        }

        // Query Firestore directly for existing stravaActivityIds (single source of truth)
        const firestoreActivities = await getSportActivities(userId)
        const existingStravaIds = new Set(
          firestoreActivities.filter((a) => a.stravaActivityId).map((a) => a.stravaActivityId!),
        )

        // Only write truly new activities to Firestore
        for (const stravaAct of stravaActivities) {
          if (!existingStravaIds.has(stravaAct.stravaActivityId)) {
            await addSportActivity({
              userId,
              type: stravaAct.type,
              name: stravaAct.name,
              date: stravaAct.date,
              duration: stravaAct.duration,
              distance: stravaAct.distance,
              calories: stravaAct.calories,
              source: "Strava",
              stravaActivityId: stravaAct.stravaActivityId,
            })
          }
        }

        // Reload everything from Firestore as the canonical state
        const allActivities = await getSportActivities(userId)
        const mapped: SportActivity[] = allActivities.map((a) => ({
          id: a.id!,
          userId: a.userId,
          type: a.type as SportActivity["type"],
          name: a.name,
          date: a.date,
          duration: a.duration,
          distance: a.distance,
          calories: a.calories,
          source: a.source,
          notes: a.notes,
          stravaActivityId: a.stravaActivityId,
        }))

        // Update state directly — Firestore is already up to date, skip updateState
        if (onActivitiesReload) {
          onActivitiesReload(mapped)
        }
      } catch (err: any) {
        setError(err.message || "Failed to sync Strava activities")
        if (err.message?.includes("reconnect")) {
          await deleteStravaConnection(userId)
          setStravaConnection(null)
          updateState("connections", [{ platform: "Strava", isConnected: false }])
        }
      } finally {
        setIsSyncing(false)
        syncingRef.current = false
      }
    },
    [stravaConnection, userId, state.user?.weight, onActivitiesReload],
  )

  // Check for Strava OAuth callback hash on mount
  useEffect(() => {
    const authData = parseStravaAuthHash()
    const errorMsg = parseStravaErrorHash()

    if (errorMsg) {
      setError(errorMsg)
      clearHash()
      return
    }

    if (authData && userId) {
      clearHash()
      const connectionData: FirestoreStravaConnection = {
        userId,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        expiresAt: authData.expiresAt,
        athleteId: authData.athleteId,
        athleteName: authData.athleteName,
        connectedAt: new Date().toISOString(),
      }

      saveStravaConnection(userId, connectionData)
        .then(() => {
          setStravaConnection(connectionData)
          updateState("connections", [
            { platform: "Strava", isConnected: true, username: authData.athleteName },
          ])
          handleSync(connectionData)
        })
        .catch((err) => setError("Failed to save Strava connection: " + err.message))
    }
  }, [userId])

  // Load existing Strava connection on mount and auto-sync
  useEffect(() => {
    if (!userId) return
    getStravaConnection(userId).then((conn) => {
      if (conn) {
        setStravaConnection(conn)
        handleSync(conn)
      }
    })
  }, [userId])

  const handleConnectStrava = () => {
    setIsConnecting(true)
    try {
      const url = getStravaAuthUrl()
      window.location.href = url
    } catch (err: any) {
      setError(err.message)
      setIsConnecting(false)
    }
  }

  const handleDisconnectStrava = async () => {
    if (!stravaConnection || !userId) return

    setIsDisconnecting(true)
    try {
      await disconnectStrava(stravaConnection.accessToken)
    } catch {
      // Deauthorize may fail if token expired, but we still disconnect locally
    }

    try {
      await deleteStravaConnection(userId)
    } catch (err: any) {
      setError("Failed to remove connection: " + err.message)
    }

    // Remove Strava activities from local state
    const manualOnly = (state.sportActivities || []).filter((a) => a.source !== "Strava")
    updateState("sportActivities", manualOnly)
    updateState("connections", [{ platform: "Strava", isConnected: false }])
    setStravaConnection(null)
    setIsDisconnecting(false)
  }

  const handleAddManual = () => {
    if (!newActivity.name) return
    const activity: SportActivity = {
      id: Math.random().toString(36).substr(2, 9),
      type: newActivity.type as SportActivity["type"],
      name: newActivity.name!,
      date: newActivity.date!,
      duration: newActivity.duration!,
      source: "Manual",
      userId: userId || "",
    }
    updateState("sportActivities", [activity, ...(state.sportActivities || [])])
    setIsModalOpen(false)
    setNewActivity({ type: "Strength", name: "", duration: 30, date: getTodayDateString() })
  }

  const isStravaConnected = !!stravaConnection

  // Stats calculations
  const today = getTodayDateString()
  const activities = state.sportActivities || []

  const todayActivities = useMemo(() => activities.filter((a) => a.date === today), [activities, today])

  const todayCaloriesBurned = useMemo(
    () => todayActivities.reduce((sum, a) => sum + (a.calories || 0), 0),
    [todayActivities],
  )

  const weeklyStats = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekActivities = activities.filter((a) => new Date(a.date) >= sevenDaysAgo)
    return {
      minutes: weekActivities.reduce((sum, a) => sum + a.duration, 0),
      count: weekActivities.length,
      calories: weekActivities.reduce((sum, a) => sum + (a.calories || 0), 0),
    }
  }, [activities])

  // Group activities by type for summary
  const activityByType = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weekActivities = activities.filter((a) => new Date(a.date) >= sevenDaysAgo)

    const grouped: Record<string, { count: number; minutes: number; calories: number; distance: number }> = {}
    for (const act of weekActivities) {
      if (!grouped[act.type]) {
        grouped[act.type] = { count: 0, minutes: 0, calories: 0, distance: 0 }
      }
      grouped[act.type].count++
      grouped[act.type].minutes += act.duration
      grouped[act.type].calories += act.calories || 0
      grouped[act.type].distance += act.distance || 0
    }
    return grouped
  }, [activities])

  // Sort activities by date (most recent first)
  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activities],
  )

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: "#0a0a0a" }}>
            Sports & Activities
          </h2>
          <p className="text-muted-foreground">Sync with Strava or log your sessions manually.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: "#10b981" }}
          className="flex items-center space-x-2 text-white px-4 py-2 rounded-none hover:opacity-90 transition-colors shadow-sm"
        >
          <Icons.Plus />
          <span>Manual Log</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-none flex justify-between items-center">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-400 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-none shadow-sm border border-border">
          <p className="text-sm text-muted-foreground font-medium">Today's Burned</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold" style={{ color: "#0a0a0a" }}>
              {Math.round(todayCaloriesBurned)}
            </h3>
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: "rgba(181, 228, 140, 0.2)", color: "#34d399" }}>
              kcal
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">
            {todayActivities.length} activit{todayActivities.length === 1 ? "y" : "ies"} today
          </p>
        </div>

        <div className="bg-card p-6 rounded-none shadow-sm border border-border">
          <p className="text-sm text-muted-foreground font-medium">Weekly Minutes</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold" style={{ color: "#0a0a0a" }}>
              {weeklyStats.minutes}
            </h3>
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: "rgba(22, 138, 173, 0.1)", color: "#10b981" }}>
              min
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Last 7 days</p>
        </div>

        <div className="bg-card p-6 rounded-none shadow-sm border border-border">
          <p className="text-sm text-muted-foreground font-medium">Weekly Calories</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold" style={{ color: "#0a0a0a" }}>
              {Math.round(weeklyStats.calories)}
            </h3>
            <span className="text-xs font-semibold px-2 py-1 rounded" style={{ backgroundColor: "rgba(252, 97, 0, 0.1)", color: "#FC6100" }}>
              kcal
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">
            {weeklyStats.count} activities
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Connection + Activity Breakdown */}
        <div className="space-y-6">
          {/* Connection Management */}
          <div className="bg-card p-6 rounded-none shadow-sm border border-border">
            <h3 className="text-lg font-bold mb-4" style={{ color: "#0a0a0a" }}>
              Strava
            </h3>
            <div className="p-4 bg-background rounded-none border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-none bg-[#FC6100] flex items-center justify-center text-white shadow-sm">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#0a0a0a" }}>
                      {isStravaConnected ? stravaConnection?.athleteName || "Connected" : "Not Connected"}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">
                      {isStravaConnected ? "Connected" : "Connect to sync activities"}
                    </p>
                  </div>
                </div>
              </div>

              {isStravaConnected ? (
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSync()}
                    disabled={isSyncing}
                    className="flex-1 px-3 py-2 rounded-none text-xs font-bold transition-all bg-[#FC6100] text-white hover:bg-[#e55800] shadow-sm disabled:opacity-50"
                  >
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={handleDisconnectStrava}
                    disabled={isDisconnecting}
                    className="px-3 py-2 rounded-none text-xs font-bold transition-all border border-red-500/30 text-red-500 hover:bg-red-500/150/10 disabled:opacity-50"
                  >
                    {isDisconnecting ? "..." : "Disconnect"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectStrava}
                  disabled={isConnecting}
                  className="w-full px-4 py-2 rounded-none text-xs font-bold transition-all bg-[#FC6100] text-white hover:bg-[#e55800] shadow-sm disabled:opacity-50"
                >
                  {isConnecting ? "Redirecting..." : "Connect Strava"}
                </button>
              )}
            </div>
          </div>

          {/* Activity Breakdown by Type */}
          {Object.keys(activityByType).length > 0 && (
            <div
              style={{ background: "linear-gradient(135deg, #10b981, #d1fae5)" }}
              className="p-6 rounded-none text-white shadow-lg"
            >
              <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-4">Weekly Breakdown</h4>
              <div className="space-y-3">
                {Object.entries(activityByType)
                  .sort(([, a], [, b]) => b.minutes - a.minutes)
                  .map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{ACTIVITY_TYPE_ICONS[type] || "\u26A1"}</span>
                        <div>
                          <p className="text-sm font-bold">{type}</p>
                          <p className="text-[10px] opacity-70">
                            {data.count}x &middot; {data.minutes} min
                            {data.distance > 0 ? ` \u00B7 ${data.distance.toFixed(1)} km` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{Math.round(data.calories)}</p>
                        <p className="text-[10px] opacity-70">kcal</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Fallback stats if no breakdown */}
          {Object.keys(activityByType).length === 0 && (
            <div
              style={{ background: "linear-gradient(135deg, #10b981, #d1fae5)" }}
              className="p-6 rounded-none text-white shadow-lg"
            >
              <h4 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-4">Sport Stats</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-baseline border-b border-white/10 pb-2">
                  <span className="text-xs opacity-70">Weekly Minutes</span>
                  <span className="text-xl font-bold">{weeklyStats.minutes} min</span>
                </div>
                <div className="flex justify-between items-baseline border-b border-white/10 pb-2">
                  <span className="text-xs opacity-70">Total Activities</span>
                  <span className="text-xl font-bold">{activities.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold" style={{ color: "#0a0a0a" }}>
            Recent Activities
          </h3>
          <div className="space-y-3">
            {sortedActivities.length > 0 ? (
              sortedActivities.map((act) => (
                <div
                  key={act.id}
                  className="bg-card p-5 rounded-none border border-border hover:border-[#059669] transition-all group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-12 h-12 rounded-none flex items-center justify-center text-xl"
                        style={{
                          backgroundColor:
                            act.source === "Strava" ? "rgba(252, 97, 0, 0.1)" : "rgba(26, 117, 159, 0.1)",
                        }}
                      >
                        {ACTIVITY_TYPE_ICONS[act.type] || "\u26A1"}
                      </div>
                      <div>
                        <h4
                          className="font-bold group-hover:text-[#059669] transition-colors"
                          style={{ color: "#0a0a0a" }}
                        >
                          {act.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground font-medium">
                          <span>{act.date}</span>
                          <span>&middot;</span>
                          <span>{act.type}</span>
                          <span>&middot;</span>
                          <span className="flex items-center">
                            {act.source === "Strava" && (
                              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current mr-1 text-[#FC6100]">
                                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                              </svg>
                            )}
                            {act.source}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black" style={{ color: "#0a0a0a" }}>
                        {act.duration} <span className="text-[10px] uppercase text-muted-foreground">min</span>
                      </p>
                      {act.distance && (
                        <p className="text-xs font-bold" style={{ color: "#10b981" }}>
                          {act.distance} km
                        </p>
                      )}
                      {act.calories && (
                        <p className="text-xs font-bold" style={{ color: "#34d399" }}>
                          {Math.round(act.calories)} kcal
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center bg-background rounded-none border-2 border-dashed border-border">
                <div className="flex justify-center mb-4 text-muted-foreground">
                  <Icons.Sports />
                </div>
                <p className="text-muted-foreground italic">No activities yet. Connect Strava or add a manual log.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: "rgba(24, 78, 119, 0.2)" }}
        >
          <div className="bg-card rounded-none w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h3 className="text-xl font-bold" style={{ color: "#0a0a0a" }}>
                Add Manual Activity
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground text-2xl">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Activity Name</label>
                <input
                  type="text"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-[#10b981]"
                  placeholder="e.g., Push Day (Chest & Tris)"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Type</label>
                  <select
                    value={newActivity.type}
                    onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value as any })}
                    className="w-full px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-[#10b981]"
                  >
                    <option value="Run">Run</option>
                    <option value="Cycle">Cycle / Spinning</option>
                    <option value="Swim">Swim</option>
                    <option value="Walk">Walk</option>
                    <option value="Hike">Hike</option>
                    <option value="Strength">Strength / Gym</option>
                    <option value="Tennis">Tennis</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Duration (min)</label>
                  <input
                    type="number"
                    value={newActivity.duration}
                    onChange={(e) => setNewActivity({ ...newActivity, duration: Number.parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-[#10b981]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Date</label>
                <input
                  type="date"
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                  className="w-full px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-[#10b981]"
                />
              </div>
            </div>
            <div className="p-6 bg-background border-t border-border flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-muted-foreground font-bold hover:bg-muted rounded-none"
              >
                Cancel
              </button>
              <button
                onClick={handleAddManual}
                style={{ backgroundColor: "#10b981" }}
                className="px-6 py-2 text-white font-bold rounded-none hover:opacity-90 transition-colors shadow-lg"
              >
                Log Activity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SportsPage
