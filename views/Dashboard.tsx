"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { type AppState, TaskStatus } from "../types"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import AIBriefPanel from "../components/AIBriefPanel"
import { AIAgentService } from "../services/aiAgentService"
import type { DailyBrief } from "../services/aiAgentService"
import { getTodayDateString, formatDateForInput } from "../lib/dateUtils"

interface DashboardProps {
  state: AppState
}

const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  const {
    tasks = [],
    habits = [],
    meals = [],
    waterIntake = [],
    weightEntries = [],
    user,
    sportActivities = [],
  } = state
  const [taskTrendDays, setTaskTrendDays] = useState<7 | 30 | 90>(7)

  // Task Summary
  const taskSummary = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
    done: tasks.filter((t) => t.status === TaskStatus.DONE).length,
  }

  const today = getTodayDateString()

  // Habit Summary (Today's completion)
  const habitCompletionToday =
    habits.length > 0 ? (habits.filter((h) => h.completions[today]).length / habits.length) * 100 : 0

  // Weight History (Last 7 entries)
  const weightData = weightEntries.slice(-7).map((w) => ({ date: w.date, weight: w.value }))

  // Water Today
  const waterToday = waterIntake.filter((w) => w.date === today).reduce((sum, curr) => sum + curr.amount, 0)

  // Nutrition (Today's calories)
  const caloriesToday = meals.filter((n) => n.date === today).reduce((sum, curr) => sum + curr.calories, 0)

  // Sports (Last 7 days minutes)
  const sportsMinutesWeekly = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return sportActivities.filter((s) => new Date(s.date) >= sevenDaysAgo).reduce((acc, curr) => acc + curr.duration, 0)
  }, [sportActivities])

  const calTarget = user?.targetCalories || 2000
  const waterTarget = user?.targetWater || 2500

  // Task Completion Trend Data
  const completionTrendData = useMemo(() => {
    const data = []
    const now = new Date()

    for (let i = taskTrendDays - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dateStr = formatDateForInput(d)

      const count = tasks.filter((t) => t.status === TaskStatus.DONE && t.completedAt === dateStr).length

      data.push({
        date: dateStr,
        displayDate: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        completed: count,
      })
    }
    return data
  }, [tasks, taskTrendDays])

  const dailyBrief: DailyBrief = useMemo(() => {
    const calorieBalance = AIAgentService.calculateCalorieBalance(state)
    const insights = AIAgentService.analyzeState(state)
    const priorities = AIAgentService.generatePriorities(state)
    const motivation = AIAgentService.generateMotivation()

    return {
      greeting: `Welcome Back, ${state.user?.name}!`,
      motivation,
      calorieBalance,
      insights,
      priorities,
      habitReminders: [],
    }
  }, [state])

  const hasNoData =
    tasks.length === 0 &&
    habits.length === 0 &&
    meals.length === 0 &&
    waterIntake.length === 0 &&
    sportActivities.length === 0 &&
    weightEntries.length === 0

  return (
    <div className="space-y-8">
      <header className="mb-6">
        <div>
          <h2 className="text-3xl font-bold text-yaleblue">Welcome Back, {state.user?.name || "User"}!</h2>
          <p className="text-muted-foreground">Here's a summary of your lifestyle today.</p>
        </div>
      </header>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-none shadow-sm border border-border hover:border-lightgreen transition-colors">
          <p className="text-sm text-muted-foreground font-medium">Tasks Progress</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-yaleblue">
              {taskSummary.done}/{taskSummary.total}
            </h3>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-willowgreen/20 text-oceanmist">Active</span>
          </div>
          <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-cerulean transition-all duration-500"
              style={{ width: `${taskSummary.total ? (taskSummary.done / taskSummary.total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-card p-6 rounded-none shadow-sm border border-border hover:border-tropicalteal transition-colors">
          <p className="text-sm text-muted-foreground font-medium">Weekly Activity</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-yaleblue">{sportsMinutesWeekly} min</h3>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-limecream/20 text-tropicalteal">Sports</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">Last 7 days</p>
        </div>

        <div className="bg-card p-6 rounded-none shadow-sm border border-border hover:border-bondiblue transition-colors">
          <p className="text-sm text-muted-foreground font-medium">Calories Today</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-yaleblue">{Math.round(caloriesToday)}</h3>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-oceanmist/10 text-bondiblue">kcal</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Target: {calTarget} kcal</p>
        </div>

        <div className="bg-card p-6 rounded-none shadow-sm border border-border hover:border-cerulean transition-colors">
          <p className="text-sm text-muted-foreground font-medium">Water Intake</p>
          <div className="flex items-end justify-between mt-2">
            <h3 className="text-2xl font-bold text-yaleblue">{(waterToday / 1000).toFixed(2)}L</h3>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-cerulean/10 text-cerulean">
              of {waterTarget / 1000}L
            </span>
          </div>
          <div className="mt-4 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-bondiblue transition-all duration-500"
              style={{ width: `${Math.min((waterToday / waterTarget) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AIBriefPanel brief={dailyBrief} />

        <div className="bg-card p-6 rounded-none shadow-sm border border-border">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold text-balticblue">Task Completion Trend</h4>
            <div className="flex bg-background p-1 rounded-none border border-border">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTaskTrendDays(d as any)}
                  className={`px-3 py-1 text-xs font-bold rounded-none transition-all ${
                    taskTrendDays === d ? "bg-card text-cerulean shadow-sm" : "text-muted-foreground hover:text-muted-foreground"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="displayDate"
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  tick={{ fill: "#64748b", fontSize: 10 }}
                  minTickGap={30}
                />
                <YAxis
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    fontSize: "14px",
                  }}
                  formatter={(value: number) => [value, "Tasks Completed"]}
                  labelStyle={{ color: "#fafafa", fontWeight: "bold" }}
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#f59e0b"
                  strokeWidth={4}
                  dot={{ fill: "#b5e48c", stroke: "#0a0a0a", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "#d9ed92", stroke: "#0a0a0a", strokeWidth: 2 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
