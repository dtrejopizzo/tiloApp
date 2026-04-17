import type { User, SportActivity, FoodEntry } from "../types"

export const calorieCalculator = {
  // Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
  calculateBMR(user: User): number {
    if (!user.weight || !user.height || !user.age || !user.gender) return 0

    if (user.gender === "male") {
      return 10 * user.weight + 6.25 * user.height - 5 * user.age + 5
    } else {
      return 10 * user.weight + 6.25 * user.height - 5 * user.age - 161
    }
  },

  // Calculate calories burned from activities
  calculateActivityCalories(activity: SportActivity, user: User): number {
    if (!user.weight) return 0

    // MET (Metabolic Equivalent) values for different activities
    const metValues: Record<string, number> = {
      Run: 9.8,
      Cycle: 7.5,
      Swim: 8.3,
      Tennis: 7.3,
      Strength: 5.0,
      Other: 4.0,
    }

    const met = metValues[activity.type] || 4.0
    const hours = activity.duration / 60

    // Calories = MET × weight(kg) × time(hours)
    return met * user.weight * hours
  },

  // Calculate daily steps calories (if we have steps data)
  calculateStepsCalories(steps: number, user: User): number {
    if (!user.weight) return 0
    // Approximate: 0.04 calories per step per kg of body weight
    return (steps * 0.04 * user.weight) / 100
  },

  // Get net calories for a specific date
  getNetCalories(date: string, user: User, nutrition: FoodEntry[], sports: SportActivity[]): number {
    const bmr = this.calculateBMR(user)

    // Calories consumed
    const consumed = nutrition.filter((n) => n.date === date).reduce((sum, n) => sum + n.calories, 0)

    // Calories burned from exercise
    const burned = sports
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + this.calculateActivityCalories(s, user), 0)

    // Net = Consumed - (BMR + Exercise)
    // Positive means surplus, negative means deficit
    return consumed - (bmr + burned)
  },
}
