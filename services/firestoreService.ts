import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase"

function getDb(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore can only be used on the client side")
  }
  const db = getFirebaseDb()
  if (!db) {
    throw new Error("Firestore not initialized")
  }
  return db
}

function validateUserId(userId: string | undefined): asserts userId is string {
  if (!userId || typeof userId !== "string") {
    throw new Error("Invalid userId: user must be authenticated")
  }
}

// ============ TASKS ============
export interface FirestoreTask {
  id?: string
  userId: string
  title: string
  project: string
  deadline: string
  status: "To Do" | "Done"
  priority: "Low" | "Medium" | "High"
  completedAt?: string
  createdAt?: any
}

export async function getTasks(userId: string): Promise<FirestoreTask[]> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const q = query(collection(db, "tasks"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreTask)
  } catch (error) {
    console.error("[v0] Error getting tasks:", error)
    return []
  }
}

export async function addTask(task: Omit<FirestoreTask, "id" | "createdAt">): Promise<string> {
  validateUserId(task.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "tasks"), {
    ...task,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateTask(taskId: string, data: Partial<FirestoreTask>): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, "tasks", taskId), data)
}

export async function deleteTask(taskId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "tasks", taskId))
}

// ============ HABITS ============
export interface FirestoreHabit {
  id?: string
  userId: string
  name: string
  frequency: "Daily" | "Weekly"
  completions: Record<string, boolean>
  createdAt?: any
}

export async function getHabits(userId: string): Promise<FirestoreHabit[]> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const q = query(collection(db, "habits"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreHabit)
  } catch (error) {
    console.error("[v0] Error getting habits:", error)
    return []
  }
}

export async function addHabit(habit: Omit<FirestoreHabit, "id" | "createdAt">): Promise<string> {
  validateUserId(habit.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "habits"), {
    ...habit,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateHabit(habitId: string, data: Partial<FirestoreHabit>): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, "habits", habitId), data)
}

export async function deleteHabit(habitId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "habits", habitId))
}

// ============ MEALS ============
export interface FirestoreMeal {
  id?: string
  userId: string
  date: string
  description: string
  calories: number
  fat: number
  carbs: number
  proteins: number
  fiber: number
  mealType: string
  createdAt?: any
}

export async function getMeals(userId: string): Promise<FirestoreMeal[]> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const q = query(collection(db, "meals"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreMeal)
  } catch (error) {
    console.error("[v0] Error getting meals:", error)
    return []
  }
}

export async function addMeal(meal: Omit<FirestoreMeal, "id" | "createdAt">): Promise<string> {
  validateUserId(meal.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "meals"), {
    ...meal,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function deleteMeal(mealId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "meals", mealId))
}

// ============ WATER INTAKE ============
export interface FirestoreWaterEntry {
  id?: string
  userId: string
  date: string
  amount: number
  createdAt?: any
}

export async function getWaterEntries(userId: string): Promise<FirestoreWaterEntry[]> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const q = query(collection(db, "water"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreWaterEntry)
  } catch (error) {
    console.error("[v0] Error getting water entries:", error)
    return []
  }
}

export async function addWaterEntry(entry: Omit<FirestoreWaterEntry, "id" | "createdAt">): Promise<string> {
  validateUserId(entry.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "water"), {
    ...entry,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function deleteWaterEntry(entryId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "water", entryId))
}

// ============ SPORTS ACTIVITIES ============
export interface FirestoreSportActivity {
  id?: string
  userId: string
  type: string
  name: string
  date: string
  duration: number
  distance?: number
  calories?: number
  source: "Strava" | "Manual"
  notes?: string
  stravaActivityId?: number
  createdAt?: any
}

export async function getSportActivities(userId: string): Promise<FirestoreSportActivity[]> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const q = query(collection(db, "sports"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreSportActivity)
  } catch (error) {
    console.error("[v0] Error getting sport activities:", error)
    return []
  }
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T
}

export async function addSportActivity(activity: Omit<FirestoreSportActivity, "id" | "createdAt">): Promise<string> {
  validateUserId(activity.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "sports"), {
    ...stripUndefined(activity),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateSportActivity(activityId: string, data: Partial<FirestoreSportActivity>): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, "sports", activityId), stripUndefined(data))
}

export async function deleteSportActivity(activityId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "sports", activityId))
}

// ============ WEIGHT ENTRIES ============
export interface FirestoreWeightEntry {
  id?: string
  userId: string
  date: string
  value: number
  createdAt?: any
}

export async function getWeightEntries(userId: string): Promise<FirestoreWeightEntry[]> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const q = query(collection(db, "weight"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as FirestoreWeightEntry)
  } catch (error) {
    console.error("[v0] Error getting weight entries:", error)
    return []
  }
}

export async function addWeightEntry(entry: Omit<FirestoreWeightEntry, "id" | "createdAt">): Promise<string> {
  validateUserId(entry.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "weight"), {
    ...entry,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWeightEntry(entryId: string, data: Partial<FirestoreWeightEntry>): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, "weight", entryId), data)
}

export async function deleteWeightEntry(entryId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "weight", entryId))
}

// ============ PRODUCTIVITY CONNECTIONS ============
export interface FirestoreProductivityConnection {
  id?: string
  userId: string
  gmailConnected: boolean
  calendarConnected: boolean
  updatedAt?: any
}

export async function getProductivityConnection(userId: string): Promise<FirestoreProductivityConnection | null> {
  try {
    validateUserId(userId) // Added validation
    const db = getDb()
    const docSnap = await getDoc(doc(db, "productivityConnections", userId))
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FirestoreProductivityConnection
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting productivity connection:", error)
    return null
  }
}

export async function updateProductivityConnection(
  userId: string,
  data: Partial<FirestoreProductivityConnection>,
): Promise<void> {
  const db = getDb()
  await setDoc(
    doc(db, "productivityConnections", userId),
    {
      ...data,
      userId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

// ============ STRAVA CONNECTIONS ============
export interface FirestoreStravaConnection {
  userId: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  athleteId: number
  athleteName?: string
  connectedAt: string
  updatedAt?: any
}

export async function getStravaConnection(userId: string): Promise<FirestoreStravaConnection | null> {
  try {
    validateUserId(userId)
    const db = getDb()
    const docSnap = await getDoc(doc(db, "stravaConnections", userId))
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreStravaConnection
    }
    return null
  } catch (error) {
    console.error("Error getting Strava connection:", error)
    return null
  }
}

export async function saveStravaConnection(
  userId: string,
  data: Omit<FirestoreStravaConnection, "updatedAt">,
): Promise<void> {
  const db = getDb()
  await setDoc(doc(db, "stravaConnections", userId), { ...data, updatedAt: serverTimestamp() }, { merge: true })
}

export async function deleteStravaConnection(userId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "stravaConnections", userId))
}

// ============ GOOGLE CONNECTIONS ============
export interface FirestoreGoogleConnection {
  userId: string
  email: string
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in seconds
  accountName: string
  connectedAt: string
  updatedAt?: any
}

function googleDocId(userId: string, email: string): string {
  return `${userId}_${email.replace(/[^a-zA-Z0-9]/g, "_")}`
}

export async function getGoogleConnections(userId: string): Promise<(FirestoreGoogleConnection & { id: string })[]> {
  try {
    validateUserId(userId)
    const db = getDb()
    const q = query(collection(db, "googleConnections"), where("userId", "==", userId))
    const snapshot = await getDocs(q)
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as FirestoreGoogleConnection & { id: string })
  } catch (error) {
    console.error("Error getting Google connections:", error)
    return []
  }
}

export async function saveGoogleConnection(
  userId: string,
  email: string,
  data: Omit<FirestoreGoogleConnection, "updatedAt">,
): Promise<string> {
  const db = getDb()
  const docId = googleDocId(userId, email)
  await setDoc(doc(db, "googleConnections", docId), { ...data, updatedAt: serverTimestamp() }, { merge: true })
  return docId
}

export async function updateGoogleConnection(
  docId: string,
  data: Partial<FirestoreGoogleConnection>,
): Promise<void> {
  const db = getDb()
  await updateDoc(doc(db, "googleConnections", docId), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteGoogleConnection(docId: string): Promise<void> {
  const db = getDb()
  await deleteDoc(doc(db, "googleConnections", docId))
}

// ============ FEEDBACK ============
export interface FirestoreFeedback {
  id?: string
  userId: string
  type: "bug" | "feature"
  description: string
  images?: string[]
  createdAt?: any
}

export async function addFeedback(feedback: Omit<FirestoreFeedback, "id" | "createdAt">): Promise<string> {
  validateUserId(feedback.userId) // Added validation
  const db = getDb()
  const docRef = await addDoc(collection(db, "feedback"), {
    ...feedback,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}
