"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import type { AppState, User, ReminderConfig } from "./types"
import { useAuth } from "./components/AuthProvider"
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  getHabits,
  addHabit,
  updateHabit,
  deleteHabit,
  getMeals,
  addMeal,
  deleteMeal,
  getWaterEntries,
  addWaterEntry,
  deleteWaterEntry,
  getSportActivities,
  addSportActivity,
  updateSportActivity,
  deleteSportActivity,
  getStravaConnection,
  getWeightEntries,
  addWeightEntry,
  updateWeightEntry,
  deleteWeightEntry,
} from "./services/firestoreService"
import { updateUserProfile } from "./services/authService"
import Dashboard from "./views/Dashboard"
import TasksPage from "./views/TasksPage"
import HabitsPage from "./views/HabitsPage"
import NutritionPage from "./views/NutritionPage"
import SportsPage from "./views/SportsPage"
import HealthPage from "./views/HealthPage"
import AccountPage from "./views/AccountPage"
import ProductivityPage from "./views/ProductivityPage"
import AuthPage from "./views/AuthPage"
import { NavUser } from "./components/NavUser"
import { Menu, Home, ListTodo, Target, Utensils, Dumbbell, Heart, Briefcase, Loader2 } from "lucide-react"
import FeedbackModal from "./components/FeedbackModal"
import FloatingAIChat from "./components/FloatingAIChat"
import { signOut } from "./services/authService"
import { matchHabitsToActivities } from "./services/habitMatcher"
import { getTodayDateString } from "./lib/dateUtils"

const DEFAULT_REMINDERS: ReminderConfig[] = [
  { id: "water", label: "Drink Water", enabled: true, time: "10:00", frequency: "hourly" },
  { id: "meds", label: "Take Medication", enabled: false, time: "08:00", frequency: "daily" },
  { id: "exercise", label: "Exercise", enabled: true, time: "17:30", frequency: "daily" },
  { id: "food", label: "Record Meals", enabled: true, time: "13:00", frequency: "daily" },
  { id: "weight", label: "Record Weight", enabled: true, time: "07:30", frequency: "daily" },
  { id: "habits", label: "Habit Review", enabled: true, time: "21:00", frequency: "daily" },
  { id: "tasks", label: "Task Planning", enabled: true, time: "09:00", frequency: "daily" },
]

const LOADING_MESSAGES = [
  "Polishing the pixels on your dashboard...",
  "Crunching the numbers (and maybe some abs)...",
  "Herding your health goals into a nice straight line...",
  "Syncing your habits (even the bad ones)...",
  "Doing the math so you can eat the snacks...",
  "Flexing our processors to check your workout...",
  "Sending good vibes to your wellness routine...",
  "Loading your gains... please wait...",
  "Laying down the red carpet to your success...",
  "Watering your productivity plants...",
  "Brewing a fresh pot of daily insights...",
  "Dialing up the 'Healthier You' on the phone...",
  "Injecting some caffeine into your planner...",
  "Plotting your world domination (and fitness goals)...",
  "Stretching our hamstrings to assist you better...",
]

const App: React.FC = () => {
  const { user: firebaseUser, profile, loading: authLoading, refreshProfile } = useAuth()
  const [dataLoading, setDataLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState(LOADING_MESSAGES[0])

  useEffect(() => {
    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])
  }, [])

  const [state, setState] = useState<AppState>({
    user: null,
    tasks: [],
    habits: [],
    meals: [],
    waterIntake: [],
    sportActivities: [],
    connections: [{ platform: "Strava", isConnected: false }],
    weightEntries: [],
  })

  const [activeTab, setActiveTab] = useState<
    "dashboard" | "tasks" | "habits" | "nutrition" | "sports" | "health" | "productivity" | "account"
  >("dashboard")
  const [accountSection, setAccountSection] = useState<"account" | "password" | "notifications">("account")
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  useEffect(() => {
    // Read initial tab from URL on mount
    if (typeof window !== "undefined") {
      const path = window.location.pathname
      const tabFromUrl = path.substring(1) || "dashboard"
      if (
        ["dashboard", "tasks", "habits", "nutrition", "sports", "health", "productivity", "account"].includes(
          tabFromUrl,
        )
      ) {
        setActiveTab(tabFromUrl as any)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && !authLoading && firebaseUser) {
      const newPath = activeTab === "dashboard" ? "/" : `/${activeTab}`
      if (window.location.pathname !== newPath) {
        window.history.pushState({}, "", newPath)
      }
    }
  }, [activeTab, authLoading, firebaseUser])

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname
      const tabFromUrl = path.substring(1) || "dashboard"
      if (
        ["dashboard", "tasks", "habits", "nutrition", "sports", "health", "productivity", "account"].includes(
          tabFromUrl,
        )
      ) {
        setActiveTab(tabFromUrl as any)
      }
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  const loadUserData = useCallback(async () => {
    if (!firebaseUser) {
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    try {
      const [tasks, habits, meals, waterEntries, sportActivities, weightEntries, stravaConnection] = await Promise.all([
        getTasks(firebaseUser.uid).catch(() => []),
        getHabits(firebaseUser.uid).catch(() => []),
        getMeals(firebaseUser.uid).catch(() => []),
        getWaterEntries(firebaseUser.uid).catch(() => []),
        getSportActivities(firebaseUser.uid).catch(() => []),
        getWeightEntries(firebaseUser.uid).catch(() => []),
        getStravaConnection(firebaseUser.uid).catch(() => null),
      ])

      // Convert Firestore data to app state format
      setState({
        user: {
          id: firebaseUser.uid,
          name: profile?.name || firebaseUser.displayName || "User",
          email: profile?.email || firebaseUser.email || "",
          avatar: profile?.avatar || firebaseUser.photoURL || undefined,
          age: profile?.age,
          gender: profile?.gender,
          height: profile?.height,
          weight: profile?.weight,
          targetCalories: profile?.targetCalories || 2000,
          targetWater: profile?.targetWater || 2500,
          reminders: DEFAULT_REMINDERS,
        },
        tasks: tasks.map((t) => ({
          id: t.id!,
          title: t.title,
          project: t.project,
          deadline: t.deadline,
          status: t.status,
          priority: t.priority,
          completedAt: t.completedAt,
        })),
        habits: habits.map((h) => ({
          id: h.id!,
          name: h.name,
          frequency: h.frequency,
          completions: h.completions || {},
        })),
        meals: meals.map((m) => ({
          id: m.id!,
          date: m.date,
          description: m.description,
          calories: m.calories,
          fat: m.fat,
          carbs: m.carbs,
          proteins: m.proteins,
          fiber: m.fiber,
          mealType: m.mealType,
        })),
        waterIntake: waterEntries.map((w) => ({
          id: w.id!,
          date: w.date,
          amount: w.amount,
        })),
        sportActivities: sportActivities.map((s) => ({
          id: s.id!,
          type: s.type,
          name: s.name,
          date: s.date,
          duration: s.duration,
          distance: s.distance,
          calories: s.calories,
          source: s.source,
          notes: s.notes,
          stravaActivityId: s.stravaActivityId,
        })),
        connections: [
          {
            platform: "Strava" as const,
            isConnected: !!stravaConnection,
            username: stravaConnection?.athleteName,
          },
        ],
        weightEntries: weightEntries.map((w) => ({
          id: w.id!,
          date: w.date,
          value: w.value,
        })),
      })
    } catch (error) {
      console.error("[v0] Error loading user data:", error)
      setState({
        user: {
          id: firebaseUser.uid,
          name: profile?.name || firebaseUser.displayName || "User",
          email: profile?.email || firebaseUser.email || "",
          avatar: profile?.avatar || firebaseUser.photoURL || undefined,
          targetCalories: 2000,
          targetWater: 2500,
          reminders: DEFAULT_REMINDERS,
        },
        tasks: [],
        habits: [],
        meals: [],
        waterIntake: [],
        sportActivities: [],
        connections: [{ platform: "Strava", isConnected: false }],
        weightEntries: [],
      })
    } finally {
      setDataLoading(false)
    }
  }, [firebaseUser, profile])

  useEffect(() => {
    if (firebaseUser) {
      loadUserData()
    } else if (!authLoading) {
      setDataLoading(false)
    }
  }, [firebaseUser, authLoading, loadUserData])

  const handleLogout = async () => {
    await signOut()
    setState({
      user: null,
      tasks: [],
      habits: [],
      meals: [],
      waterIntake: [],
      sportActivities: [],
      connections: [{ platform: "Strava", isConnected: false }],
      weightEntries: [],
    })
  }

  const updateState = async <K extends keyof AppState>(key: K, value: AppState[K]) => {
    if (!firebaseUser) return

    // Handle different state updates with Firebase
    if (key === "tasks") {
      const newTasks = value as AppState["tasks"]
      const oldTasks = state.tasks

      // Find added tasks
      for (const task of newTasks) {
        const existingTask = oldTasks.find((t) => t.id === task.id)
        if (!existingTask) {
          // New task
          const taskData: any = {
            userId: firebaseUser.uid,
            title: task.title,
            project: task.project,
            deadline: task.deadline,
            status: task.status,
            priority: task.priority,
          }
          if (task.completedAt) {
            taskData.completedAt = task.completedAt
          }
          const id = await addTask(taskData)
          task.id = id
        } else if (JSON.stringify(existingTask) !== JSON.stringify(task)) {
          // Updated task
          const taskData: any = {
            title: task.title,
            project: task.project,
            deadline: task.deadline,
            status: task.status,
            priority: task.priority,
          }
          if (task.completedAt) {
            taskData.completedAt = task.completedAt
          }
          await updateTask(task.id, taskData)
        }
      }

      // Find deleted tasks
      for (const oldTask of oldTasks) {
        if (!newTasks.find((t) => t.id === oldTask.id)) {
          await deleteTask(oldTask.id)
        }
      }
    } else if (key === "habits") {
      const newHabits = value as AppState["habits"]
      const oldHabits = state.habits

      for (const habit of newHabits) {
        const existingHabit = oldHabits.find((h) => h.id === habit.id)
        if (!existingHabit) {
          const id = await addHabit({
            userId: firebaseUser.uid,
            name: habit.name,
            frequency: habit.frequency,
            completions: habit.completions,
          })
          habit.id = id
        } else if (JSON.stringify(existingHabit) !== JSON.stringify(habit)) {
          await updateHabit(habit.id, {
            name: habit.name,
            frequency: habit.frequency,
            completions: habit.completions,
          })
        }
      }

      for (const oldHabit of oldHabits) {
        if (!newHabits.find((h) => h.id === oldHabit.id)) {
          await deleteHabit(oldHabit.id)
        }
      }
    } else if (key === "meals") {
      const newMeals = value as AppState["meals"]
      const oldMeals = state.meals

      for (const meal of newMeals) {
        const existingMeal = oldMeals.find((m) => m.id === meal.id)
        if (!existingMeal) {
          const id = await addMeal({
            userId: firebaseUser.uid,
            date: meal.date,
            description: meal.description,
            calories: meal.calories,
            fat: meal.fat,
            carbs: meal.carbs,
            proteins: meal.proteins,
            fiber: meal.fiber,
            mealType: meal.mealType,
          })
          meal.id = id
        }
      }

      for (const oldMeal of oldMeals) {
        if (!newMeals.find((m) => m.id === oldMeal.id)) {
          await deleteMeal(oldMeal.id)
        }
      }
    } else if (key === "waterIntake") {
      const newWater = value as AppState["waterIntake"]
      const oldWater = state.waterIntake

      for (const entry of newWater) {
        const existingEntry = oldWater.find((w) => w.id === entry.id)
        if (!existingEntry) {
          const id = await addWaterEntry({
            userId: firebaseUser.uid,
            date: entry.date,
            amount: entry.amount,
          })
          entry.id = id
        }
      }

      for (const oldEntry of oldWater) {
        if (!newWater.find((w) => w.id === oldEntry.id)) {
          await deleteWaterEntry(oldEntry.id)
        }
      }
    } else if (key === "sportActivities") {
      const newSports = value as AppState["sportActivities"]
      const oldSports = state.sportActivities

      // Fetch all existing activities from Firestore for reliable dedup
      let firestoreActivities: Awaited<ReturnType<typeof getSportActivities>> = []
      try {
        firestoreActivities = await getSportActivities(firebaseUser.uid)
      } catch {}
      const firestoreStravaIds = new Set(
        firestoreActivities.filter((a) => a.stravaActivityId).map((a) => a.stravaActivityId!),
      )

      for (const activity of newSports) {
        const existingActivity = oldSports.find((s) => s.id === activity.id)
        if (!existingActivity) {
          // Skip if this stravaActivityId already exists in Firestore
          if (activity.stravaActivityId && firestoreStravaIds.has(activity.stravaActivityId)) {
            // Find the real Firestore ID and update the local activity
            const fsDoc = firestoreActivities.find((a) => a.stravaActivityId === activity.stravaActivityId)
            if (fsDoc?.id) {
              activity.id = fsDoc.id
            }
            continue
          }
          const id = await addSportActivity({
            userId: firebaseUser.uid,
            type: activity.type,
            name: activity.name,
            date: activity.date,
            duration: activity.duration,
            distance: activity.distance,
            calories: activity.calories,
            source: activity.source,
            notes: activity.notes,
            stravaActivityId: activity.stravaActivityId,
          })
          activity.id = id
        } else if (JSON.stringify(existingActivity) !== JSON.stringify(activity)) {
          await updateSportActivity(activity.id, {
            type: activity.type,
            name: activity.name,
            date: activity.date,
            duration: activity.duration,
            distance: activity.distance,
            calories: activity.calories,
            source: activity.source,
            notes: activity.notes,
          })
        }
      }

      for (const oldActivity of oldSports) {
        if (!newSports.find((s) => s.id === oldActivity.id)) {
          await deleteSportActivity(oldActivity.id)
        }
      }
    } else if (key === "weightEntries") {
      const newEntries = value as AppState["weightEntries"]
      const oldEntries = state.weightEntries

      for (const entry of newEntries) {
        const existingEntry = oldEntries.find((w) => w.id === entry.id)
        if (!existingEntry) {
          const id = await addWeightEntry({
            userId: firebaseUser.uid,
            date: entry.date,
            value: entry.value,
          })
          entry.id = id

          const latestWeight = newEntries.reduce((latest, current) => {
            return new Date(current.date) > new Date(latest.date) ? current : latest
          }, entry)

          if (latestWeight && state.user) {
            await updateUserProfile(firebaseUser.uid, { weight: latestWeight.value })
            setState((prev) => ({
              ...prev,
              user: prev.user ? { ...prev.user, weight: latestWeight.value } : null,
            }))
          }
        } else if (JSON.stringify(existingEntry) !== JSON.stringify(entry)) {
          await updateWeightEntry(entry.id, {
            date: entry.date,
            value: entry.value,
          })

          const latestWeight = newEntries.reduce((latest, current) => {
            return new Date(current.date) > new Date(latest.date) ? current : latest
          }, entry)

          if (latestWeight && state.user) {
            await updateUserProfile(firebaseUser.uid, { weight: latestWeight.value })
            setState((prev) => ({
              ...prev,
              user: prev.user ? { ...prev.user, weight: latestWeight.value } : null,
            }))
          }
        }
      }

      for (const oldEntry of oldEntries) {
        if (!newEntries.find((e) => e.id === oldEntry.id)) {
          await deleteWeightEntry(oldEntry.id)

          if (newEntries.length > 0 && state.user) {
            const latestWeight = newEntries.reduce((latest, current) => {
              return new Date(current.date) > new Date(latest.date) ? current : latest
            })
            await updateUserProfile(firebaseUser.uid, { weight: latestWeight.value })
            setState((prev) => ({
              ...prev,
              user: prev.user ? { ...prev.user, weight: latestWeight.value } : null,
            }))
          }
        }
      }
    }

    setState((prev) => ({ ...prev, [key]: value }))
  }

  const updateUser = async (userData: Partial<User>) => {
    if (!firebaseUser || !state.user) return

    await updateUserProfile(firebaseUser.uid, userData)
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...userData } : null,
    }))
    await refreshProfile()
  }

  // Auto-complete habits based on sport activities (today + past days)
  useEffect(() => {
    if (!firebaseUser || state.habits.length === 0) return

    const activities = state.sportActivities || []
    if (activities.length === 0) return

    // Get all unique dates that have activities
    const activityDates = [...new Set(activities.map((a) => a.date))]

    let anyChanged = false
    let updatedHabits = [...state.habits]

    for (const date of activityDates) {
      const dayActivities = activities.filter((a) => a.date === date)
      const matchedIds = matchHabitsToActivities(updatedHabits, dayActivities, date)

      for (const id of matchedIds) {
        const idx = updatedHabits.findIndex((h) => h.id === id)
        if (idx === -1) continue
        const habit = updatedHabits[idx]
        if (habit.completions[date]) continue // already marked

        anyChanged = true
        updatedHabits[idx] = {
          ...habit,
          completions: { ...habit.completions, [date]: true },
        }
        // Persist to Firestore directly
        updateHabit(id, { completions: { ...habit.completions, [date]: true } })
      }
    }

    if (anyChanged) {
      setState((prev) => ({ ...prev, habits: updatedHabits }))
    }
  }, [state.sportActivities, state.habits.length, firebaseUser])

  // Called by SportsPage after Strava sync writes directly to Firestore
  const handleActivitiesReload = useCallback((activities: any[]) => {
    setState((prev) => ({ ...prev, sportActivities: activities }))
  }, [])

  const handleNavigateToAccount = (section: "account" | "password" | "notifications") => {
    setAccountSection(section)
    setActiveTab("account")
  }

  const handleAskAI = async (prompt: string): Promise<string> => {
    try {
      const response = await fetch("/api/ai-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, prompt }),
      })

      const data = await response.json()
      return data.advice || "Unable to generate advice at this time."
    } catch (error) {
      console.error("AI request failed:", error)
      return "Unable to connect to AI coach. Please try again."
    }
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard state={state} />
      case "tasks":
        return <TasksPage state={state} updateState={updateState} />
      case "habits":
        return <HabitsPage state={state} updateState={updateState} />
      case "nutrition":
        return <NutritionPage state={state} updateState={updateState} />
      case "sports":
        return <SportsPage state={state} updateState={updateState} onActivitiesReload={handleActivitiesReload} />
      case "health":
        return <HealthPage state={state} updateState={updateState} />
      case "productivity":
        return <ProductivityPage state={state} />
      case "account":
        return <AccountPage state={state} onUpdateUser={updateUser} initialSection={accountSection} />
      default:
        return <Dashboard state={state} />
    }
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: "Overview",
      tasks: "Tasks",
      habits: "Habits",
      nutrition: "Nutrition",
      sports: "Sports",
      health: "Health",
      productivity: "Productivity",
      account: "Account Settings",
    }
    return titles[activeTab] || "Overview"
  }

  const menuItems = [
    { id: "dashboard" as const, label: "Overview", icon: Home },
    { id: "tasks" as const, label: "Tasks", icon: ListTodo },
    { id: "habits" as const, label: "Habits", icon: Target },
    { id: "nutrition" as const, label: "Nutrition", icon: Utensils },
    { id: "sports" as const, label: "Sports", icon: Dumbbell },
    { id: "health" as const, label: "Health", icon: Heart },
    { id: "productivity" as const, label: "Productivity", icon: Briefcase },
  ]

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center border border-border p-12 bg-card max-w-sm w-full mx-6" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          <div className="w-10 h-10 border-2 border-border border-t-primary animate-spin mx-auto mb-6"></div>
          <p className="text-foreground text-sm font-medium">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  if (!firebaseUser) {
    return <AuthPage onLogin={() => {}} />
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${isSidebarOpen ? "w-60" : "w-0"} bg-sidebar transition-all duration-300 overflow-hidden flex flex-col border-r border-sidebar-border flex-shrink-0`}
      >
        {/* App Name */}
        <div className="h-12 px-5 border-b border-sidebar-border flex items-center">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 flex items-center justify-center bg-primary flex-shrink-0">
              {/* Tilo leaf/sprout logo */}
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 14V8" stroke="white" strokeWidth="1.5" strokeLinecap="square"/>
                <path d="M8 11C7.5 11 4 9.5 4 6C4 6 7.5 4.5 11 7C12.5 8.5 11.5 11 8 11Z" fill="white"/>
              </svg>
            </div>
            <h1 className="text-sm font-bold text-sidebar-foreground tracking-widest uppercase">TILO</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border-l-2 border-primary pl-[10px]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground border-l-2 border-transparent"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium tracking-wide">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-2 pb-3 border-t border-sidebar-border pt-3 space-y-0.5">
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="w-full flex items-center space-x-3 px-3 py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all border-l-2 border-transparent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-xs font-medium tracking-wide">Feedback</span>
          </button>

          <NavUser
            user={{
              name: state.user?.name || profile?.name || "User",
              email: state.user?.email || profile?.email || "",
              avatar: state.user?.avatar || profile?.avatar,
            }}
            onNavigateToAccount={handleNavigateToAccount}
            onLogout={handleLogout}
          />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto bg-background flex flex-col">
          {/* Page Header */}
          <div className="h-12 border-b border-border bg-background/95 backdrop-blur flex items-center px-6 flex-shrink-0">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all mr-4"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-semibold text-foreground">{getPageTitle()}</h2>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
        </main>
      </div>

      {/* Feedback Modal */}
      {isFeedbackOpen && <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />}

      {/* Floating AI Chat */}
      <FloatingAIChat onAskAI={handleAskAI} />
    </div>
  )
}

export default App
