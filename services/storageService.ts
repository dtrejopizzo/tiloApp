import type { AppState } from "../types"

const STORAGE_KEY = "tilo_data"

const isBrowser = typeof window !== "undefined"

export const storageService = {
  save: (state: AppState) => {
    if (!isBrowser) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  },
  load: (): AppState => {
    if (!isBrowser) {
      return {
        user: null,
        tasks: [],
        habits: [],
        nutrition: [],
        water: [],
        weights: [],
        sports: [],
        connections: [{ platform: "Strava", isConnected: false }],
        projects: ["Personal", "Work"],
      }
    }

    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      return {
        user: null,
        tasks: [],
        habits: [],
        nutrition: [],
        water: [],
        weights: [],
        sports: [],
        connections: [{ platform: "Strava", isConnected: false }],
        projects: ["Personal", "Work"],
      }
    }
    return JSON.parse(data)
  },
  clear: () => {
    if (!isBrowser) return
    localStorage.removeItem(STORAGE_KEY)
  },
}
