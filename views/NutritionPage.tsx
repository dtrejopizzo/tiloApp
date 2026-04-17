"use client"

import type React from "react"
import { useState } from "react"
import type { AppState, FoodEntry, WaterEntry } from "../types"
import { nutritionAI } from "../services/geminiService"
import { Icons } from "../constants"
import { getTodayDateString } from "../lib/dateUtils"

interface NutritionPageProps {
  state: AppState
  updateState: <K extends keyof AppState>(key: K, value: AppState[K]) => void
}

const NutritionPage: React.FC<NutritionPageProps> = ({ state, updateState }) => {
  const [foodDesc, setFoodDesc] = useState("")
  const [selectedMealType, setSelectedMealType] = useState("Breakfast")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const today = getTodayDateString()

  const mealTypes = [
    { id: "Breakfast", label: "Desayuno" },
    { id: "Lunch", label: "Almuerzo" },
    { id: "Merienda", label: "Merienda" },
    { id: "Dinner", label: "Cena" },
    { id: "Snack", label: "Snack" },
  ]

  const handleAnalyzeFood = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodDesc || isAnalyzing) return

    setIsAnalyzing(true)
    const result = await nutritionAI.analyzeFood(foodDesc)
    setIsAnalyzing(false)

    if (result) {
      const entry: FoodEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: today,
        description: foodDesc,
        ...result,
        mealType: selectedMealType || result.mealType,
        userId: state.user!.id,
      }
      updateState("meals", [entry, ...(state.meals || [])])
      setFoodDesc("")
    }
  }

  const addWater = (amount: number) => {
    const entry: WaterEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: today,
      amount,
      userId: state.user!.id,
    }
    updateState("waterIntake", [...(state.waterIntake || []), entry])
  }

  const subtractWater = (amount: number) => {
    const lastEntry = [...(state.waterIntake || [])]
      .filter((w) => w.date === today)
      .sort((a, b) => (b.id > a.id ? 1 : -1))[0]

    if (lastEntry && lastEntry.amount === amount) {
      // Remove the exact entry if it matches
      updateState(
        "waterIntake",
        (state.waterIntake || []).filter((w) => w.id !== lastEntry.id),
      )
    }
  }

  const deleteFood = (id: string) => {
    updateState(
      "meals",
      (state.meals || []).filter((n) => n.id !== id),
    )
  }

  const deleteWaterEntry = (id: string) => {
    updateState(
      "waterIntake",
      (state.waterIntake || []).filter((w) => w.id !== id),
    )
  }

  const foodsToday = (state.meals || []).filter((n) => n.date === today)
  const waterToday = (state.waterIntake || []).filter((w) => w.date === today)
  const totalWater = waterToday.reduce((sum, curr) => sum + curr.amount, 0)

  const totalsToday = foodsToday.reduce(
    (acc, curr) => ({
      calories: acc.calories + curr.calories,
      proteins: acc.proteins + curr.proteins,
      carbs: acc.carbs + curr.carbs,
      fat: acc.fat + curr.fat,
      fiber: acc.fiber + curr.fiber,
    }),
    { calories: 0, proteins: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  const calTarget = state.user?.targetCalories || 2000
  const waterTarget = state.user?.targetWater || 2500
  const waterPercentage = Math.min((totalWater / waterTarget) * 100, 100)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-yaleblue">Nutrition & Hydration</h2>
        <p className="text-muted-foreground">Track what you eat and drink using AI.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-card p-4 rounded-none shadow-sm border border-border">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase">Calories</h4>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#10b981" }}>
            {Math.round(totalsToday.calories)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round((totalsToday.calories / calTarget) * 100)}% of {calTarget} kcal
          </p>
          <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="h-full"
              style={{
                width: `${Math.min((totalsToday.calories / calTarget) * 100, 100)}%`,
                backgroundColor: "#10b981",
              }}
            />
          </div>
        </div>

        <div className="bg-card p-4 rounded-none shadow-sm border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Protein</h4>
          <p className="text-2xl font-bold" style={{ color: "#0a0a0a" }}>
            {Math.round(totalsToday.proteins)}g
          </p>
          <p className="text-xs text-muted-foreground mt-1">Daily intake</p>
        </div>

        <div className="bg-card p-4 rounded-none shadow-sm border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Carbs</h4>
          <p className="text-2xl font-bold" style={{ color: "#10b981" }}>
            {Math.round(totalsToday.carbs)}g
          </p>
          <p className="text-xs text-muted-foreground mt-1">Daily intake</p>
        </div>

        <div className="bg-card p-4 rounded-none shadow-sm border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Fat</h4>
          <p className="text-2xl font-bold" style={{ color: "#10b981" }}>
            {Math.round(totalsToday.fat)}g
          </p>
          <p className="text-xs text-muted-foreground mt-1">Daily intake</p>
        </div>

        <div className="bg-card p-4 rounded-none shadow-sm border border-border">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Fiber</h4>
          <p className="text-2xl font-bold" style={{ color: "#059669" }}>
            {Math.round(totalsToday.fiber)}g
          </p>
          <p className="text-xs text-muted-foreground mt-1">Daily intake</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Logging - reduced size */}
        <div className="lg:col-span-2 space-y-6">
          {/* Food Logger - more compact */}
          <div className="bg-card p-5 rounded-none shadow-sm border border-border">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-yaleblue">Log Food</h3>
              <p className="text-xs text-muted-foreground font-medium">describi lo que comiste (puese ser texto o audio)</p>
            </div>

            <form onSubmit={handleAnalyzeFood} className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {mealTypes.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    onClick={() => setSelectedMealType(meal.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      selectedMealType === meal.id
                        ? "bg-tropicalteal border-tropicalteal text-white shadow-sm"
                        : "bg-card border-border text-muted-foreground hover:border-tropicalteal"
                    }`}
                  >
                    {meal.label}
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  value={foodDesc}
                  onChange={(e) => setFoodDesc(e.target.value)}
                  placeholder="e.g., A black coffee with a toast of white bread and 50 grams of banana"
                  className="w-full h-32 px-4 py-3 border border-border rounded-none outline-none focus:ring-2 focus:ring-cerulean resize-none transition-all pr-12"
                />
                <button
                  type="button"
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-background text-muted-foreground hover:text-cerulean hover:bg-cerulean/10 transition-colors"
                  title="Audio description (Coming soon)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-20a3 3 0 00-3 3v8a3 3 0 006 0V5a3 3 0 00-3-3z"
                    />
                  </svg>
                </button>
              </div>

              <button
                type="submit"
                disabled={isAnalyzing}
                className={`w-full py-3 rounded-none font-bold text-white shadow-sm transition-all flex items-center justify-center space-x-2 ${
                  isAnalyzing
                    ? "bg-muted cursor-not-allowed"
                    : "bg-tropicalteal hover:bg-oceanmist shadow-lg shadow-tropicalteal/20"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Analyzing Ingredients...</span>
                  </>
                ) : (
                  <span>Log Meal with Tilo AI</span>
                )}
              </button>
            </form>
          </div>

          <div className="bg-card rounded-none shadow-sm border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-background">
              <h3 className="text-lg font-bold text-yaleblue">Today's Meals</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-card border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold text-balticblue">Meal</th>
                    <th className="px-4 py-2 text-xs font-semibold text-balticblue">Description</th>
                    <th className="px-4 py-2 text-xs font-semibold text-balticblue text-right">Macros</th>
                    <th className="px-4 py-2 text-xs font-semibold text-balticblue text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {foodsToday.map((food) => (
                    <tr key={food.id} className="hover:bg-limecream/5 transition-colors group">
                      <td className="px-4 py-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-limecream/30 text-tropicalteal uppercase">
                          {mealTypes.find((m) => m.id === food.mealType)?.label || food.mealType}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <p className="text-sm font-medium text-yaleblue">{food.description}</p>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2 text-xs">
                          <span className="bg-background px-1.5 py-0.5 rounded font-medium">
                            {Math.round(food.calories)} kcal
                          </span>
                          <span className="text-balticblue">P:{Math.round(food.proteins)}g</span>
                          <span className="text-bondiblue">C:{Math.round(food.carbs)}g</span>
                          <span className="text-tropicalteal">F:{Math.round(food.fat)}g</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => deleteFood(food.id)}
                          className="p-1 text-muted-foreground hover:text-tropicalteal opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Icons.Delete />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {foodsToday.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground italic text-sm">
                        No meals logged today. Use the AI logger above!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Water - more compact */}
        <div className="space-y-6">
          {/* Water Intake - Thermal Bottle Style - more compact */}
          <div className="bg-card p-5 rounded-none shadow-sm border border-border">
            <h3 className="text-lg font-bold mb-3 text-center" style={{ color: "#0a0a0a" }}>
              Hydration
            </h3>
            <div className="flex justify-center mb-4 relative">
              <div className="relative w-24 h-40 flex flex-col items-center">
                {/* Bottle Cap */}
                <div className="w-8 h-3 bg-muted rounded-t-lg z-20 border-x border-t border-border"></div>
                {/* Bottle Neck */}
                <div className="w-12 h-3 bg-muted z-20 border-x border-border"></div>
                {/* Bottle Body */}
                <div className="w-20 flex-1 bg-background border-2 border-border rounded-none relative overflow-hidden shadow-inner">
                  {/* Water Fill */}
                  <div
                    className="absolute bottom-0 left-0 w-full transition-all duration-700 ease-out"
                    style={{
                      height: `${waterPercentage}%`,
                      background: "linear-gradient(to top, #10b981, #059669)",
                    }}
                  >
                    {/* Ripple effect overlay */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-card/20 animate-pulse"></div>
                  </div>
                  {/* Percentage label in middle of bottle */}
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="text-center bg-card/40 backdrop-blur-[1px] px-2 py-1 rounded-none">
                      <span className="text-base font-black" style={{ color: "#0a0a0a" }}>
                        {totalWater}
                      </span>
                      <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">ml</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-3">
              Daily Goal: {waterTarget / 1000}L
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {[250, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => addWater(amt)}
                  className="py-2 font-bold rounded-none transition-all text-sm border hover:text-white"
                  style={{
                    backgroundColor: "rgba(26, 117, 159, 0.05)",
                    color: "#10b981",
                    borderColor: "rgba(26, 117, 159, 0.1)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#10b981"
                    e.currentTarget.style.color = "white"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(26, 117, 159, 0.05)"
                    e.currentTarget.style.color = "#10b981"
                  }}
                >
                  +{amt >= 1000 ? amt / 1000 + "L" : amt + "ml"}
                </button>
              ))}
            </div>

            {waterToday.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-[10px] text-muted-foreground font-bold uppercase text-center mb-2">Today's Intake</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {waterToday
                    .sort((a, b) => b.id.localeCompare(a.id))
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded-none bg-background hover:bg-secondary transition-colors group"
                      >
                        <span className="text-xs font-medium text-foreground">
                          {entry.amount >= 1000 ? entry.amount / 1000 + "L" : entry.amount + "ml"}
                        </span>
                        <button
                          onClick={() => deleteWaterEntry(entry.id)}
                          className="p-1 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Delete this entry"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NutritionPage
