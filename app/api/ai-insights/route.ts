import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export const runtime = "nodejs"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { state, prompt } = await req.json()

    // Build context from user's data
    const context = `
You are a personal AI wellness and productivity coach with access to the user's comprehensive lifestyle data.

USER PROFILE:
- Name: ${state.user?.name || "User"}
- Age: ${state.user?.age || "not set"}
- Height: ${state.user?.height || "not set"} cm
- Weight: ${state.user?.weight || "not set"} kg
- Gender: ${state.user?.gender || "not set"}
- Target Calories: ${state.user?.targetCalories || 2000} kcal
- Target Water: ${state.user?.targetWater || 2500} ml

TODAY'S DATA:
- Tasks: ${state.tasks?.length || 0} total, ${state.tasks?.filter((t: any) => t.status === "Done").length || 0} completed
- Habits: ${state.habits?.length || 0} tracked
- Meals logged today: ${state.meals?.filter((m: any) => m.date === new Date().toISOString().split("T")[0]).length || 0}
- Water intake entries: ${state.waterIntake?.length || 0}
- Exercise activities: ${state.sports?.length || 0}
- Weight entries: ${state.weightEntries?.length || 0}

RECENT TASKS:
${
  state.tasks
    ?.slice(0, 5)
    .map((t: any) => `- ${t.title} (${t.status}, ${t.priority} priority)`)
    .join("\n") || "No tasks"
}

RECENT MEALS:
${
  state.meals
    ?.slice(0, 3)
    .map((m: any) => `- ${m.description} (${m.calories} kcal)`)
    .join("\n") || "No meals logged"
}

RECENT EXERCISE:
${
  state.sports
    ?.slice(0, 3)
    .map((s: any) => `- ${s.name} (${s.duration} min, ${s.type})`)
    .join("\n") || "No activities"
}

IMPORTANT INSTRUCTIONS:
- Keep responses concise and actionable (2-3 short paragraphs maximum)
- Use plain text only, NO markdown formatting (no #, **, *, etc.)
- Be specific and reference their actual data
- Focus on ONE main actionable insight per response
- Be encouraging but brief
- Speak naturally as a friendly coach

The user is tracking their tasks, habits, nutrition, exercise, and health metrics. Provide specific, actionable advice to improve their productivity, health, and overall wellbeing.
`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: context },
        { role: "user", content: prompt },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 300,
    })

    const advice = completion.choices[0]?.message?.content || "Unable to generate advice at this time."

    return NextResponse.json({ advice })
  } catch (error) {
    console.error("AI Insights error:", error)
    return NextResponse.json({ error: "Failed to generate insights" }, { status: 500 })
  }
}
