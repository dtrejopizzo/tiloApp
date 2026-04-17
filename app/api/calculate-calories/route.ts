import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { user, activity } = await request.json()

    if (!user || !user.weight || !activity) {
      return NextResponse.json({ error: "Missing required data" }, { status: 400 })
    }

    // MET values for different activities
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
    const calories = met * user.weight * hours

    return NextResponse.json({ calories: Math.round(calories) })
  } catch (error) {
    console.error("[v0] Error calculating calories:", error)
    return NextResponse.json({ error: "Failed to calculate calories" }, { status: 500 })
  }
}

export const runtime = "edge"
