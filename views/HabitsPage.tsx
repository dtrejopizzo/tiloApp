"use client"

import type React from "react"
import { useState, useMemo } from "react"
import { type AppState, type Habit, HabitFrequency } from "../types"
import { Icons } from "../constants"
import { getTodayDateString, formatDateForInput } from "../lib/dateUtils"

interface HabitsPageProps {
  state: AppState
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void
}

const HabitsPage: React.FC<HabitsPageProps> = ({ state, updateState }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newHabitName, setNewHabitName] = useState("")
  const [newHabitFreq, setNewHabitFreq] = useState<HabitFrequency>(HabitFrequency.DAILY)

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentMonthName = now.toLocaleString("default", { month: "long" })

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }, [currentYear, currentMonth])

  const monthData = useMemo(() => {
    const days = ["S", "M", "T", "W", "T", "F", "S"]
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1
      const dateObj = new Date(currentYear, currentMonth, dayNum)
      const dateStr = formatDateForInput(dateObj)
      return {
        date: dateStr,
        dayNum,
        dayInitial: days[dateObj.getDay()],
        isSunday: dateObj.getDay() === 0,
        isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
      }
    })
  }, [daysInMonth, currentYear, currentMonth])

  const handleCreateHabit = () => {
    if (!newHabitName) return
    const habit: Habit = {
      id: Math.random().toString(36).substr(2, 9),
      name: newHabitName,
      frequency: newHabitFreq,
      completions: {},
      userId: state.user!.id,
    }
    updateState("habits", [...state.habits, habit])
    setNewHabitName("")
    setIsModalOpen(false)
  }

  const toggleHabit = (id: string, date: string) => {
    const updated = state.habits.map((h) => {
      if (h.id === id) {
        const completions = { ...h.completions }
        completions[date] = !completions[date]
        return { ...h, completions }
      }
      return h
    })
    updateState("habits", updated)
  }

  const deleteHabit = (id: string) => {
    if (confirm(`Are you sure you want to delete "${state.habits.find((h) => h.id === id)?.name}"?`)) {
      updateState(
        "habits",
        state.habits.filter((h) => h.id !== id),
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ color: "#0a0a0a" }}>
            Habit Tracker
          </h2>
          <p className="text-muted-foreground">
            Track your progress for {currentMonthName} {currentYear}.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{ backgroundColor: "#10b981" }}
          className="flex items-center space-x-2 text-white px-4 py-2 rounded-none hover:opacity-90 transition-colors shadow-sm"
        >
          <Icons.Plus />
          <span>Add New Habit</span>
        </button>
      </div>

      <div className="bg-card rounded-none shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <div className="min-w-max">
            <div className="flex border-b border-border bg-background">
              <div className="w-48 px-6 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center bg-background sticky left-0 z-10 border-r border-border">
                Habit
              </div>
              <div className="flex">
                {monthData.map((dayInfo) => (
                  <div
                    key={dayInfo.dayNum}
                    className={`w-8 h-12 flex flex-col items-center justify-center text-[9px] font-bold border-r ${
                      dayInfo.isSunday ? "border-r-slate-400" : "border-r-slate-100"
                    } ${dayInfo.dayNum === now.getDate() ? "text-[#0a0a0a]" : "text-muted-foreground"}`}
                    style={
                      dayInfo.dayNum === now.getDate() ? { backgroundColor: "rgba(217, 237, 146, 0.3)" } : undefined
                    }
                  >
                    <span className={`mb-0.5 opacity-60`} style={dayInfo.isWeekend ? { color: "#059669" } : undefined}>
                      {dayInfo.dayInitial}
                    </span>
                    <span className="text-[10px]">{dayInfo.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {state.habits.map((habit) => (
                <div key={habit.id} className="flex hover:bg-background/50 transition-colors group">
                  <div className="w-48 px-6 py-2 bg-card sticky left-0 z-10 border-r border-border flex items-center justify-between group-hover:bg-background shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="truncate pr-2">
                      <p className="text-sm font-bold truncate" style={{ color: "#0a0a0a" }} title={habit.name}>
                        {habit.name}
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-tighter" style={{ color: "#059669" }}>
                        {habit.frequency}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <Icons.Delete />
                    </button>
                  </div>
                  <div className="flex">
                    {monthData.map((dayInfo) => {
                      const isCompleted = habit.completions[dayInfo.date]
                      const isToday = dayInfo.date === getTodayDateString()
                      return (
                        <div
                          key={dayInfo.date}
                          className={`w-8 h-10 flex items-center justify-center border-r transition-colors ${
                            dayInfo.isSunday ? "border-r-slate-400" : "border-r-slate-100"
                          } ${isToday ? "bg-background/50" : ""} ${dayInfo.isWeekend ? "bg-background/30" : ""}`}
                        >
                          <button
                            onClick={() => toggleHabit(habit.id, dayInfo.date)}
                            className={`w-5 h-5 rounded transition-all flex items-center justify-center border ${
                              isCompleted
                                ? "text-white shadow-sm scale-110"
                                : "bg-card border-border hover:border-[#99d98c] text-transparent"
                            }`}
                            style={isCompleted ? { backgroundColor: "#6ee7b7", borderColor: "#6ee7b7" } : undefined}
                          >
                            {isCompleted && <Icons.Check />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {state.habits.length === 0 && (
                <div className="p-12 text-center bg-card">
                  <div className="flex justify-center mb-4 text-muted-foreground">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground font-medium italic">
                    Your habits grid is empty. Click "Add New Habit" to start building consistency.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-none border border-border shadow-sm">
          <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Legend</h4>
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <div
                className="w-5 h-5 rounded"
                style={{ backgroundColor: "#6ee7b7", borderColor: "#6ee7b7", borderWidth: 1 }}
              />
              <span>Completed</span>
            </div>
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <div className="w-5 h-5 rounded border border-border bg-card" />
              <span>Pending</span>
            </div>
            <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
              <div className="w-1 h-5 bg-muted-foreground" />
              <span>Week Divider (Sunday)</span>
            </div>
          </div>
        </div>

        <div
          className="md:col-span-2 p-6 rounded-none shadow-lg text-white"
          style={{ background: "linear-gradient(135deg, #10b981, #0a0a0a)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Monthly Consistency</h4>
              <p className="text-2xl font-black">Keep it up, {state.user?.name}!</p>
              <p className="text-sm opacity-80 mt-2">
                Week boundaries are marked to help you visualize your weekly progress.
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black opacity-40">
                {now.getDate()}/{daysInMonth}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Days in {currentMonthName}</p>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: "rgba(24, 78, 119, 0.2)" }}
        >
          <div className="bg-card rounded-none w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <div
              className="p-6 border-b border-border flex justify-between items-center"
              style={{ backgroundColor: "rgba(181, 228, 140, 0.1)" }}
            >
              <h3 className="text-xl font-bold" style={{ color: "#0a0a0a" }}>
                Add New Habit
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground text-2xl">
                &times;
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Habit Name</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                  placeholder="e.g., Early Wake Up"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Target Frequency</label>
                <select
                  value={newHabitFreq}
                  onChange={(e) => setNewHabitFreq(e.target.value as HabitFrequency)}
                  className="w-full px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                >
                  <option value={HabitFrequency.DAILY}>Daily</option>
                  <option value={HabitFrequency.WEEKLY}>Weekly</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-background border-t border-border flex justify-end space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-muted-foreground font-bold hover:bg-muted rounded-none transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHabit}
                style={{ backgroundColor: "#10b981" }}
                className="px-6 py-2 text-white font-bold rounded-none hover:opacity-90 transition-colors shadow-lg"
              >
                Create Habit
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  )
}

export default HabitsPage
