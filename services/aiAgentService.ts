import type { AppState } from "../types"
import { getTodayDateString } from "../lib/dateUtils"

export interface CalorieBalance {
  consumed: number
  burned: number
  basalMetabolism: number
  exerciseBurn: number
  netBalance: number
}

export interface AIInsight {
  type: "success" | "warning" | "info" | "motivation"
  category: "health" | "productivity" | "habits" | "overall"
  message: string
}

export interface DailyBrief {
  greeting: string
  motivation: string
  calorieBalance: CalorieBalance
  insights: AIInsight[]
  priorities: string[]
  habitReminders: string[]
}

export class AIAgentService {
  // Calculate BMR using Mifflin-St Jeor Equation
  static calculateBasalMetabolism(user: any): number {
    if (!user?.weight || !user?.height || !user?.age || !user?.gender) {
      return 1800 // default
    }

    const { weight, height, age, gender } = user

    if (gender === "male") {
      return 10 * weight + 6.25 * height - 5 * age + 5
    } else {
      return 10 * weight + 6.25 * height - 5 * age - 161
    }
  }

  // Estimate calories burned from exercise (rough estimates)
  static calculateExerciseCalories(activities: any[]): number {
    if (!activities || !Array.isArray(activities)) {
      return 0
    }

    const today = getTodayDateString()
    const todayActivities = activities.filter((a) => a.date === today)

    let totalCalories = 0
    for (const activity of todayActivities) {
      // Use stored calories if available, otherwise estimate
      if (activity.calories) {
        totalCalories += activity.calories
      } else {
        // Rough estimates per activity type (calories per minute)
        const caloriesPerMinute: Record<string, number> = {
          Run: 10,
          Swim: 8,
          Cycle: 7,
          Tennis: 6,
          Strength: 5,
          Other: 4,
        }
        const rate = caloriesPerMinute[activity.type] || 5
        totalCalories += rate * activity.duration
      }
    }

    return totalCalories
  }

  static calculateCalorieBalance(state: AppState): CalorieBalance {
    const today = getTodayDateString()
    const basalMetabolism = this.calculateBasalMetabolism(state.user)

    const meals = state.meals || []
    const consumed = meals.filter((n) => n.date === today).reduce((sum, n) => sum + n.calories, 0)

    const sportActivities = state.sportActivities || []
    const exerciseBurn = this.calculateExerciseCalories(sportActivities)
    const burned = basalMetabolism + exerciseBurn
    const netBalance = consumed - burned

    return {
      consumed,
      burned,
      basalMetabolism,
      exerciseBurn,
      netBalance,
    }
  }

  static analyzeState(state: AppState): AIInsight[] {
    const insights: AIInsight[] = []
    const today = getTodayDateString()

    const habits = state.habits || []
    const tasks = state.tasks || []
    const waterIntake = state.waterIntake || []
    const sportActivities = state.sportActivities || []

    // Analyze habits
    const habitCompletionToday =
      habits.length > 0 ? (habits.filter((h) => h.completions[today]).length / habits.length) * 100 : 0

    if (habitCompletionToday >= 80) {
      insights.push({
        type: "success",
        category: "habits",
        message: `Excellent! You've completed ${Math.round(habitCompletionToday)}% of your habits today.`,
      })
    } else if (habitCompletionToday < 50) {
      insights.push({
        type: "warning",
        category: "habits",
        message: `Only ${Math.round(habitCompletionToday)}% of habits completed. Small steps lead to big changes!`,
      })
    }

    // Analyze tasks
    const overdueTasks = tasks.filter((t) => t.status !== "Done" && new Date(t.deadline) < new Date()).length

    if (overdueTasks > 0) {
      insights.push({
        type: "warning",
        category: "productivity",
        message: `You have ${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}. Tackle them today!`,
      })
    }

    const todayTasks = tasks.filter((t) => t.deadline === today)
    const completedToday = todayTasks.filter((t) => t.status === "Done").length

    if (todayTasks.length > 0 && completedToday === todayTasks.length) {
      insights.push({
        type: "success",
        category: "productivity",
        message: `All today's tasks completed! You're on fire! 🔥`,
      })
    }

    const waterToday = waterIntake.filter((w) => w.date === today).reduce((sum, w) => sum + w.amount, 0)

    const waterTarget = state.user?.targetWater || 2500

    if (waterToday < waterTarget * 0.5) {
      insights.push({
        type: "warning",
        category: "health",
        message: `You've only had ${(waterToday / 1000).toFixed(1)}L of water. Stay hydrated!`,
      })
    }

    // Analyze calorie balance
    const balance = this.calculateCalorieBalance(state)

    if (balance.netBalance > 500) {
      insights.push({
        type: "info",
        category: "health",
        message: `You're in a calorie surplus (+${Math.round(balance.netBalance)} kcal). Great for building!`,
      })
    } else if (balance.netBalance < -500) {
      insights.push({
        type: "info",
        category: "health",
        message: `You're in a calorie deficit (${Math.round(balance.netBalance)} kcal). Perfect for weight loss!`,
      })
    }

    // Analyze exercise
    const exerciseMinutesToday = sportActivities.filter((s) => s.date === today).reduce((sum, s) => sum + s.duration, 0)

    if (exerciseMinutesToday === 0) {
      insights.push({
        type: "info",
        category: "health",
        message: `No exercise logged today. Even a 10-minute walk counts!`,
      })
    } else if (exerciseMinutesToday >= 30) {
      insights.push({
        type: "success",
        category: "health",
        message: `${exerciseMinutesToday} minutes of activity today! Keep moving!`,
      })
    }

    return insights
  }

  static generateMotivation(): string {
    const motivations = [
      "Every small step forward is progress. You've got this!",
      "Your consistency is building the life you want. Keep going!",
      "Today is another opportunity to become better than yesterday.",
      "Focus on progress, not perfection. You're doing amazing!",
      "Your dedication to self-improvement is inspiring. Stay strong!",
      "Small daily improvements lead to remarkable results over time.",
      "You're investing in yourself every day. That's powerful!",
      "Each healthy choice you make compounds into lasting change.",
    ]

    return motivations[Math.floor(Math.random() * motivations.length)]
  }

  static generatePriorities(state: AppState): string[] {
    const priorities: string[] = []
    const today = getTodayDateString()

    const tasks = state.tasks || []
    const habits = state.habits || []

    // Check high priority tasks
    const highPriorityTasks = tasks.filter((t) => t.status !== "Done" && t.priority === "High").slice(0, 2)

    highPriorityTasks.forEach((task) => {
      priorities.push(`Complete: ${task.title}`)
    })

    // Check habits not completed
    const incompleteHabits = habits.filter((h) => !h.completions[today]).slice(0, 2)
    incompleteHabits.forEach((habit) => {
      priorities.push(`Habit: ${habit.name}`)
    })

    return priorities
  }
}
