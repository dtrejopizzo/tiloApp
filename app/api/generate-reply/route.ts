import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export const runtime = "nodejs"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { from, subject, brief, category, modificationPrompt } = await request.json()

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a helpful email assistant. Generate professional and concise email replies.
          
Rules:
- Be professional and appropriate for the category
- Keep replies concise (2-3 paragraphs maximum)
- Be friendly but respectful
- Address the main points in the email summary
- Do not include a signature (the user will add their own)
- Use plain text only, no markdown formatting`,
        },
        {
          role: "user",
          content: `Generate a reply for this email:

From: ${from}
Subject: ${subject}
Email Summary: ${brief}
Category: ${category}

${modificationPrompt ? `Additional instruction: ${modificationPrompt}` : ""}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 400,
    })

    const reply = completion.choices[0]?.message?.content || "Unable to generate reply."

    return NextResponse.json({ reply })
  } catch (error) {
    console.error("Error generating reply:", error)
    return NextResponse.json({ error: "Failed to generate reply" }, { status: 500 })
  }
}
