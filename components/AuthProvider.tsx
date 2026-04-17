"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { User } from "firebase/auth"

interface UserProfile {
  uid: string
  email: string
  name: string
  avatar?: string
  age?: number
  gender?: string
  height?: number
  weight?: number
  targetCalories?: number
  targetWater?: number
}

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window === "undefined") {
      setLoading(false)
      return
    }

    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        const { onAuthStateChange, getUserProfile } = await import("@/services/authService")

        console.log("[v0] Initializing auth state listener")
        unsubscribe = onAuthStateChange(async (firebaseUser) => {
          console.log("[v0] Auth state changed:", firebaseUser?.email || "no user")
          setUser(firebaseUser)

          if (firebaseUser) {
            try {
              const userProfile = await getUserProfile(firebaseUser.uid)
              console.log("[v0] User profile loaded:", userProfile?.name)
              setProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email || userProfile?.email || "",
                name: userProfile?.name || firebaseUser.displayName || "User",
                avatar: userProfile?.avatar || firebaseUser.photoURL || undefined,
                age: userProfile?.age,
                gender: userProfile?.gender,
                height: userProfile?.height,
                weight: userProfile?.weight,
                targetCalories: userProfile?.targetCalories || 2000,
                targetWater: userProfile?.targetWater || 2500,
              })
            } catch (error) {
              console.error("[v0] Error loading user profile:", error)
              // Use fallback profile from Firebase Auth
              setProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: firebaseUser.displayName || "User",
                avatar: firebaseUser.photoURL || undefined,
                targetCalories: 2000,
                targetWater: 2500,
              })
            }
          } else {
            console.log("[v0] User logged out")
            setProfile(null)
          }
          setLoading(false)
        })
      } catch (error) {
        console.error("[v0] Error initializing auth:", error)
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  const refreshProfile = async () => {
    if (user) {
      try {
        const { getUserProfile } = await import("@/services/authService")
        const userProfile = await getUserProfile(user.uid)
        setProfile({
          uid: user.uid,
          email: user.email || userProfile?.email || "",
          name: userProfile?.name || user.displayName || "User",
          avatar: userProfile?.avatar || user.photoURL || undefined,
          age: userProfile?.age,
          gender: userProfile?.gender,
          height: userProfile?.height,
          weight: userProfile?.weight,
          targetCalories: userProfile?.targetCalories || 2000,
          targetWater: userProfile?.targetWater || 2500,
        })
      } catch (error) {
        console.error("[v0] Error refreshing profile:", error)
      }
    }
  }

  return <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
