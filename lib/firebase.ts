import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBBf_uNCpmIBwG4Ot18MygdeyTlUVLymKo",
  authDomain: "tilo-385d1.firebaseapp.com",
  projectId: "tilo-385d1",
  storageBucket: "tilo-385d1.firebasestorage.app",
  messagingSenderId: "610501595058",
  appId: "1:610501595058:web:e79dc03d6f7d85a7131eab",
}

const firebaseInstances: {
  app?: FirebaseApp
  auth?: Auth
  db?: Firestore
  googleProvider?: GoogleAuthProvider
  authInitPromise?: Promise<Auth | null>
} = {}

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined") return null

  if (!firebaseInstances.app) {
    try {
      firebaseInstances.app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
    } catch (error) {
      console.error("[v0] Firebase App initialization error:", error)
      return null
    }
  }

  return firebaseInstances.app
}

export async function getFirebaseAuth(): Promise<Auth | null> {
  if (typeof window === "undefined") return null

  // If already initializing, wait for that promise
  if (firebaseInstances.authInitPromise) {
    return firebaseInstances.authInitPromise
  }

  // If already initialized, return it
  if (firebaseInstances.auth) {
    return firebaseInstances.auth
  }

  // Start new initialization
  firebaseInstances.authInitPromise = (async () => {
    const app = getFirebaseApp()
    if (!app) return null

    // Try multiple times with delays
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Small delay to let Firebase fully register
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100 * attempt))
        }

        firebaseInstances.auth = getAuth(app)
        console.log("[v0] Firebase Auth initialized successfully")
        return firebaseInstances.auth
      } catch (error) {
        console.error(`[v0] Firebase Auth initialization error (attempt ${attempt + 1}):`, error)
        if (attempt === 2) {
          return null
        }
      }
    }
    return null
  })()

  const result = await firebaseInstances.authInitPromise
  firebaseInstances.authInitPromise = undefined
  return result
}

export function getFirebaseDb(): Firestore | null {
  if (typeof window === "undefined") return null

  if (!firebaseInstances.db) {
    const app = getFirebaseApp()
    if (!app) return null

    try {
      firebaseInstances.db = getFirestore(app)
      console.log("[v0] Firebase Firestore initialized successfully")
    } catch (error) {
      console.error("[v0] Firebase Firestore initialization error:", error)
      return null
    }
  }

  return firebaseInstances.db
}

export function getGoogleProvider(): GoogleAuthProvider | null {
  if (typeof window === "undefined") return null

  if (!firebaseInstances.googleProvider) {
    try {
      firebaseInstances.googleProvider = new GoogleAuthProvider()
      console.log("[v0] Google Auth Provider initialized successfully")
    } catch (error) {
      console.error("[v0] Google Provider initialization error:", error)
      return null
    }
  }

  return firebaseInstances.googleProvider
}
