import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
  updateProfile,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { getFirebaseAuth, getFirebaseDb, getGoogleProvider } from "@/lib/firebase"

export interface UserProfile {
  uid: string
  email: string
  name: string
  avatar?: string
  age?: number
  gender?: "male" | "female"
  height?: number
  weight?: number
  targetCalories?: number
  targetWater?: number
  createdAt?: any
  updatedAt?: any
}

// Sign up with email/password
export async function signUp(email: string, password: string, name: string): Promise<User> {
  const auth = await getFirebaseAuth()
  const db = getFirebaseDb()

  if (!auth || !db) {
    throw new Error("Firebase not initialized")
  }

  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  const user = userCredential.user

  // Update display name
  await updateProfile(user, { displayName: name })

  // Create user profile in Firestore
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    name: name,
    targetCalories: 2000,
    targetWater: 2500,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return user
}

// Sign in with email/password
export async function signIn(email: string, password: string): Promise<User> {
  const auth = await getFirebaseAuth()

  if (!auth) {
    throw new Error("Firebase Auth not initialized")
  }

  const userCredential = await signInWithEmailAndPassword(auth, email, password)
  return userCredential.user
}

// Sign in with Google
export async function signInWithGoogle(): Promise<User> {
  const auth = await getFirebaseAuth()
  const db = getFirebaseDb()
  const googleProvider = getGoogleProvider()

  if (!auth || !db || !googleProvider) {
    throw new Error("Firebase not initialized")
  }

  const userCredential = await signInWithPopup(auth, googleProvider)
  const user = userCredential.user

  // Check if user profile exists, if not create it
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid))
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "User",
        avatar: user.photoURL,
        targetCalories: 2000,
        targetWater: 2500,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    }
  } catch (error) {
    console.error("[v0] Error creating user profile:", error)
    // Try to create profile anyway
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName || "User",
        avatar: user.photoURL,
        targetCalories: 2000,
        targetWater: 2500,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (e) {
      console.error("[v0] Error creating fallback profile:", e)
    }
  }

  return user
}

// Sign out
export async function signOut(): Promise<void> {
  const auth = await getFirebaseAuth()

  if (!auth) {
    throw new Error("Firebase Auth not initialized")
  }

  await firebaseSignOut(auth)
}

// Get user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const db = getFirebaseDb()

    if (!db) {
      return {
        uid,
        email: "",
        name: "User",
        targetCalories: 2000,
        targetWater: 2500,
      }
    }

    const userDoc = await getDoc(doc(db, "users", uid))
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile
    }
    return {
      uid,
      email: "",
      name: "User",
      targetCalories: 2000,
      targetWater: 2500,
    }
  } catch (error) {
    console.error("[v0] Error getting user profile:", error)
    return {
      uid,
      email: "",
      name: "User",
      targetCalories: 2000,
      targetWater: 2500,
    }
  }
}

// Update user profile
export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  try {
    const db = getFirebaseDb()

    if (!db) {
      throw new Error("Firestore not initialized")
    }

    await setDoc(
      doc(db, "users", uid),
      {
        ...data,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
  } catch (error) {
    console.error("[v0] Error updating user profile:", error)
    throw error
  }
}

// Auth state observer
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (typeof window === "undefined") {
    return () => {}
  }

  let unsubscribe: (() => void) | undefined
  ;(async () => {
    const auth = await getFirebaseAuth()

    if (!auth) {
      callback(null)
      return
    }

    unsubscribe = onAuthStateChanged(auth, callback)
  })()

  return () => {
    if (unsubscribe) {
      unsubscribe()
    }
  }
}
