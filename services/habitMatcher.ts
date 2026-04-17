import type { Habit, SportActivity } from "../types"

/**
 * Maps sport activity types to keyword sets that habits might use.
 * Each activity type has a list of Spanish and English keywords/phrases
 * that a habit name might contain to be considered a match.
 */
const ACTIVITY_KEYWORDS: Record<string, string[]> = {
  Run: [
    "correr", "run", "running", "trotar", "jog", "jogging",
    "carrera", "5k", "10k", "media maraton", "maraton",
  ],
  Swim: [
    "nadar", "swim", "swimming", "natacion", "natación", "piscina", "pool",
  ],
  Cycle: [
    "bici", "bicicleta", "ciclismo", "cycle", "cycling", "bike", "biking",
    "spinning", "spin", "pedal", "pedalear", "ride", "riding",
  ],
  Walk: [
    "caminar", "walk", "walking", "pasear", "paseo", "caminata",
  ],
  Hike: [
    "senderismo", "hike", "hiking", "montaña", "trekking", "trek",
  ],
  Strength: [
    "pesas", "gym", "gimnasio", "fuerza", "strength", "weight", "weights",
    "musculacion", "musculación", "iron", "lift", "lifting",
    "press", "squat", "deadlift", "bench",
  ],
  Tennis: [
    "tenis", "tennis", "padel", "pádel", "raqueta", "racket", "pickleball",
  ],
}

/**
 * Keywords that match ANY type of physical activity.
 * If a habit name contains any of these, any sport activity will complete it.
 */
const GENERIC_EXERCISE_KEYWORDS = [
  "ejercicio", "ejercitar", "exercise", "entrenar", "entrenamiento",
  "training", "train", "workout", "actividad fisica", "actividad física",
  "deporte", "sport", "mover", "moverse", "active", "activo",
  "fitness", "cardio", "quemar calorias", "quemar calorías", "burn",
]

/**
 * Normalizes a string for comparison: lowercase, remove accents, trim.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

/**
 * Checks if a habit name matches a given keyword.
 * Uses substring matching so "correr 5k" matches keyword "correr".
 */
function habitMatchesKeyword(habitName: string, keyword: string): boolean {
  const normalizedHabit = normalize(habitName)
  const normalizedKeyword = normalize(keyword)
  return normalizedHabit.includes(normalizedKeyword)
}

/**
 * Determines which habits should be auto-completed based on today's sport activities.
 *
 * Returns an array of habit IDs that should be marked as completed.
 * Only returns habits that are NOT already completed for the given date.
 */
export function matchHabitsToActivities(
  habits: Habit[],
  todayActivities: SportActivity[],
  date: string,
): string[] {
  if (todayActivities.length === 0 || habits.length === 0) return []

  const todayActivityTypes = new Set(todayActivities.map((a) => a.type))
  const matchedHabitIds: string[] = []

  for (const habit of habits) {
    // Skip already completed habits
    if (habit.completions[date]) continue

    // Check if habit matches a generic exercise keyword (any activity completes it)
    const isGenericExerciseHabit = GENERIC_EXERCISE_KEYWORDS.some((kw) =>
      habitMatchesKeyword(habit.name, kw),
    )

    if (isGenericExerciseHabit) {
      matchedHabitIds.push(habit.id)
      continue
    }

    // Check if habit matches a specific activity type
    for (const [activityType, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
      if (!todayActivityTypes.has(activityType)) continue

      const matches = keywords.some((kw) => habitMatchesKeyword(habit.name, kw))
      if (matches) {
        matchedHabitIds.push(habit.id)
        break
      }
    }
  }

  return matchedHabitIds
}
