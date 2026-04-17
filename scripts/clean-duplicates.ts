/**
 * Run this once to clean duplicate Strava activities from Firestore.
 * Usage: npx tsx scripts/clean-duplicates.ts
 */
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyBBf_uNCpmIBwG4Ot18MygdeyTlUVLymKo",
  authDomain: "tilo-385d1.firebaseapp.com",
  projectId: "tilo-385d1",
  storageBucket: "tilo-385d1.firebasestorage.app",
  messagingSenderId: "610501595058",
  appId: "1:610501595058:web:e79dc03d6f7d85a7131eab",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanDuplicates() {
  const snapshot = await getDocs(collection(db, "sports"))
  const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

  console.log(`Found ${docs.length} total sport activities`)

  // Group by stravaActivityId + userId
  const seen = new Map<string, string>() // key -> first doc id
  const toDelete: string[] = []

  for (const d of docs) {
    const data = d as any
    // For Strava activities, dedup by stravaActivityId
    if (data.source === "Strava" && data.stravaActivityId) {
      const key = `${data.userId}:${data.stravaActivityId}`
      if (seen.has(key)) {
        toDelete.push(d.id)
      } else {
        seen.set(key, d.id)
      }
    } else if (data.source === "Strava" && !data.stravaActivityId) {
      // Strava activities without stravaActivityId are from the old buggy sync — dedup by name+date+duration
      const key = `${data.userId}:${data.name}:${data.date}:${data.duration}`
      if (seen.has(key)) {
        toDelete.push(d.id)
      } else {
        seen.set(key, d.id)
      }
    }
  }

  console.log(`Found ${toDelete.length} duplicates to delete`)

  for (const id of toDelete) {
    await deleteDoc(doc(db, "sports", id))
    console.log(`  Deleted: ${id}`)
  }

  console.log("Done!")
  process.exit(0)
}

cleanDuplicates().catch(console.error)
