"use client"

import type React from "react"
import { useState, useMemo } from "react"
import type { AppState, WeightEntry } from "../types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Icons } from "../constants"
import { calorieCalculator } from "../services/calorieCalculator"
import { getTodayDateString } from "../lib/dateUtils"

interface HealthPageProps {
  state: AppState
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void
}

const HealthPage: React.FC<HealthPageProps> = ({ state, updateState }) => {
  const [weightValue, setWeightValue] = useState("")
  const [weightDate, setWeightDate] = useState(getTodayDateString())
  const [currentPage, setCurrentPage] = useState(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editDate, setEditDate] = useState("")

  const ITEMS_PER_PAGE = 3

  const chartData = useMemo(() => {
    if (!state.user) return []

    const sortedEntries = [...(state.weightEntries || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    return sortedEntries.map((w) => {
      const netCalories = calorieCalculator.getNetCalories(
        w.date,
        state.user!,
        state.meals || [],
        state.sportActivities || [],
      )

      return {
        date: w.date,
        weight: w.value,
        netCalories: Math.round(netCalories),
      }
    })
  }, [state.weightEntries, state.meals, state.sportActivities, state.user])

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault()
    if (!weightValue) return

    const entry: WeightEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: weightDate,
      value: Number.parseFloat(weightValue),
      userId: state.user!.id,
    }

    const existingIndex = (state.weightEntries || []).findIndex((w) => w.date === weightDate)
    let updatedWeights
    if (existingIndex > -1) {
      updatedWeights = [...(state.weightEntries || [])]
      updatedWeights[existingIndex] = entry
    } else {
      updatedWeights = [...(state.weightEntries || []), entry]
    }

    updatedWeights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    updateState("weightEntries", updatedWeights)

    const mostRecentWeight = updatedWeights[0] // Already sorted by date descending
    if (mostRecentWeight && state.user) {
      const updatedUser = { ...state.user, weight: mostRecentWeight.value }
      updateState("user", updatedUser)
      // This will be handled by App.tsx updateUser function to sync with Firebase
    }

    setWeightValue("")
  }

  const startEdit = (entry: WeightEntry) => {
    setEditingId(entry.id)
    setEditValue(entry.value.toString())
    setEditDate(entry.date)
  }

  const saveEdit = (id: string) => {
    const updatedWeights = (state.weightEntries || []).map((w) =>
      w.id === id ? { ...w, value: Number.parseFloat(editValue), date: editDate } : w,
    )
    updatedWeights.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    updateState("weightEntries", updatedWeights)

    const mostRecentWeight = updatedWeights[0]
    if (mostRecentWeight && state.user) {
      const updatedUser = { ...state.user, weight: mostRecentWeight.value }
      updateState("user", updatedUser)
    }

    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue("")
    setEditDate("")
  }

  const deleteWeight = (id: string) => {
    updateState(
      "weightEntries",
      (state.weightEntries || []).filter((w) => w.id !== id),
    )
  }

  const sortedWeights = [...(state.weightEntries || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const totalPages = Math.ceil(sortedWeights.length / ITEMS_PER_PAGE)
  const startIndex = currentPage * ITEMS_PER_PAGE
  const paginatedWeights = sortedWeights.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-3 rounded-none shadow-lg border border-border">
          <p className="text-xs font-bold text-muted-foreground mb-1">{payload[0].payload.date}</p>
          <p className="text-sm font-bold text-bondiblue">Weight: {payload[0].value} kg</p>
          <p className="text-sm font-bold text-tropicalteal">
            Net Cal: {payload[1].value > 0 ? "+" : ""}
            {payload[1].value} kcal
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-yaleblue">Health Monitor</h2>
        <p className="text-muted-foreground">Track your body metrics and calorie balance over time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          {/* Weight Log Form */}
          <div className="bg-card p-6 rounded-none shadow-sm border border-border h-fit hover:border-lightgreen transition-colors">
            <h3 className="text-xl font-bold text-yaleblue mb-6">Log Weight</h3>
            <form onSubmit={handleAddWeight} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={weightValue}
                  onChange={(e) => setWeightValue(e.target.value)}
                  placeholder="75.5"
                  className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                <input
                  type="date"
                  value={weightDate}
                  onChange={(e) => setWeightDate(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-none outline-none focus:ring-2 focus:ring-bondiblue"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-cerulean text-white py-3 rounded-none font-bold hover:bg-balticblue transition-colors shadow-sm"
              >
                Add Entry
              </button>
            </form>
          </div>

          <div className="bg-card rounded-none shadow-sm border border-border overflow-hidden">
            {totalPages > 1 && (
              <div className="px-4 py-2 bg-background border-b border-border flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <button
                    onClick={goToPrevPage}
                    disabled={currentPage === 0}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <svg className="w-4 h-4 text-yaleblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-muted-foreground min-w-[50px] text-center">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages - 1}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <svg className="w-4 h-4 text-yaleblue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            <div>
              <table className="w-full text-left">
                <thead className="bg-card border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-balticblue">Date</th>
                    <th className="px-3 py-2 text-xs font-semibold text-balticblue">Weight</th>
                    <th className="px-3 py-2 text-xs font-semibold text-balticblue text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedWeights.map((w) => (
                    <tr key={w.id} className="hover:bg-limecream/5 transition-colors group">
                      {editingId === w.id ? (
                        <>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={editDate}
                              onChange={(e) => setEditDate(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-border rounded focus:ring-1 focus:ring-bondiblue outline-none"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              step="0.1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-border rounded focus:ring-1 focus:ring-bondiblue outline-none"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveEdit(w.id)}
                                className="p-1 text-lightgreen hover:text-cerulean transition-colors"
                                aria-label="Save"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1 text-muted-foreground hover:text-muted-foreground transition-colors"
                                aria-label="Cancel"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-xs text-foreground font-medium">{w.date}</td>
                          <td className="px-3 py-2 text-xs text-bondiblue font-bold">{w.value} kg</td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEdit(w)}
                                className="p-1 text-muted-foreground hover:text-bondiblue transition-colors"
                                aria-label="Edit"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteWeight(w.id)}
                                className="p-1 text-muted-foreground hover:text-tropicalteal transition-colors"
                                aria-label="Delete"
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path
                                    fillRule="evenodd"
                                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v11a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  {(state.weightEntries || []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-muted-foreground italic text-xs">
                        No weight data recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Chart - now takes full width */}
        <div className="lg:col-span-2">
          <div className="bg-card p-6 rounded-none shadow-sm border border-border">
            <h3 className="text-xl font-bold text-yaleblue mb-2">Weight & Calorie Balance</h3>
            <p className="text-xs text-muted-foreground mb-4">Track how your calorie balance affects your weight trend</p>
            <div className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#10b981" }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11, fill: "#10b981" }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Weight (kg)",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 10, fill: "#10b981" },
                      }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11, fill: "#40916c" }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Net Calories",
                        angle: 90,
                        position: "insideRight",
                        style: { fontSize: 10, fill: "#40916c" },
                      }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} iconType="line" />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="weight"
                      name="Weight (kg)"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ fill: "#d9ed92", r: 4, strokeWidth: 2, stroke: "#10b981" }}
                      activeDot={{ r: 6, fill: "#6ee7b7" }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="netCalories"
                      name="Net Calories"
                      stroke="#40916c"
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={{ fill: "#95d5b2", r: 4, strokeWidth: 2, stroke: "#40916c" }}
                      activeDot={{ r: 6, fill: "#52b788" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="text-bondiblue opacity-30 scale-150 mb-4">
                    <Icons.Health />
                  </div>
                  <p className="mt-2 italic">Start logging your weight to see your progress chart.</p>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-limecream/10 rounded-none border border-limecream/20">
              <p className="text-xs text-muted-foreground">
                <span className="font-bold">Net Calories</span> = Food Consumed - (Base Metabolism + Exercise). Positive
                means calorie surplus, negative means deficit. A deficit helps weight loss.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HealthPage
