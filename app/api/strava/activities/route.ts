import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const MET_VALUES: Record<string, number> = {
  Run: 9.8,
  Cycle: 7.5,
  Swim: 8.3,
  Walk: 3.8,
  Hike: 6.0,
  Tennis: 7.3,
  Strength: 5.0,
  Other: 4.0,
}

function mapStravaType(stravaType: string): string {
  const mapping: Record<string, string> = {
    Run: "Run",
    TrailRun: "Run",
    VirtualRun: "Run",
    Ride: "Cycle",
    VirtualRide: "Cycle",
    Spinning: "Cycle",
    EBikeRide: "Cycle",
    GravelRide: "Cycle",
    MountainBikeRide: "Cycle",
    Swim: "Swim",
    Walk: "Walk",
    Hike: "Hike",
    WeightTraining: "Strength",
    Workout: "Strength",
    Crossfit: "Strength",
    Tennis: "Tennis",
    Pickleball: "Tennis",
    Padel: "Tennis",
  }
  return mapping[stravaType] || "Other"
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, after, userWeight } = await req.json()

    if (!accessToken) {
      return NextResponse.json({ error: "Missing accessToken" }, { status: 400 })
    }

    const params = new URLSearchParams({ per_page: "50" })
    if (after) {
      params.set("after", String(after))
    }

    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return NextResponse.json(
        { error: errData.message || "Failed to fetch activities" },
        { status: response.status },
      )
    }

    const stravaActivities = await response.json()

    const activities = stravaActivities.map((act: any) => {
      const type = mapStravaType(act.type || act.sport_type || "Other")
      const durationMinutes = Math.round((act.moving_time || 0) / 60)
      const distanceKm = act.distance ? Math.round((act.distance / 1000) * 100) / 100 : undefined

      // Prefer Strava's calorie data, fall back to MET calculation
      let calories: number | undefined
      if (act.calories && act.calories > 0) {
        calories = Math.round(act.calories)
      } else if (userWeight && durationMinutes > 0) {
        const met = MET_VALUES[type] || 4.0
        const hours = durationMinutes / 60
        calories = Math.round(met * userWeight * hours)
      }

      return {
        stravaActivityId: act.id,
        type,
        name: act.name || `${type} Activity`,
        date: act.start_date_local ? act.start_date_local.split("T")[0] : new Date().toISOString().split("T")[0],
        duration: durationMinutes,
        distance: distanceKm,
        calories,
        source: "Strava" as const,
      }
    })

    return NextResponse.json(activities)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch activities" }, { status: 500 })
  }
}
