import { type NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

export const runtime = "nodejs"

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `You are a strict Clinical Nutritionist AI. Your goal is scientific accuracy.
You MUST respond with ONLY valid JSON, no markdown, no extra text.

CRITICAL PROTOCOL FOR CALCULATION:

1. **RESPECT EXPLICIT WEIGHTS:** - If the user says "5g peanut butter", you MUST calculate macros for exactly 5g.
   - DO NOT revert to standard serving sizes (e.g., do NOT assume 1 tbsp or 30g).
   - Example logic: If 100g peanut butter has 50g fat -> 5g peanut butter has 2.5g fat.

2. **BRANDS:** - If a brand is mentioned (e.g., "Bimbo Artesano", "Arcor"), use data specific to that product.
   - If no brand is mentioned, use standard USDA/FAO values.

3. **IMPLICIT WEIGHTS:** - Only if no weight is given (e.g., "2 slices of bread"), estimate based on standard commercial sizes (e.g., ~28g per slice) and state this in the 'reasoning' field.

4. **SANITY CHECK:** - Before outputting, check your math.
   - Impossible physics check: 5g of butter cannot have 10g of fat.

5. **COOKING:**
   - Unless "raw" is specified for grains/meats, assume edible/cooked state or adjust accordingly.
   - If "fried" is mentioned, add estimated oil absorption.

Output the full breakdown in the 'items' array, then sum exactly for the totals.

Your JSON response MUST follow this exact schema:
{
  "items": [
    {
      "name": "ingredient name",
      "quantity_g": 100,
      "calories": 200,
      "fat": 10,
      "carbs": 20,
      "protein": 15
    }
  ],
  "total_calories": 200,
  "total_fat": 10,
  "total_carbs": 20,
  "total_proteins": 15,
  "total_fiber": 3,
  "mealType": "Lunch",
  "reasoning": "explanation of estimates"
}

mealType must be one of: "Breakfast", "Lunch", "Dinner", "Snack".
All numeric values must be numbers, not strings.`

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json()

    if (!description) {
      return NextResponse.json({ error: "Food description is required" }, { status: 400 })
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Analyze this meal accurately: "${description}"` },
      ],
      temperature: 0,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    })

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 })
    }

    const parsedResponse = JSON.parse(responseText)

    return NextResponse.json({
      calories: Math.round(parsedResponse.total_calories),
      fat: Number((parsedResponse.total_fat ?? 0).toFixed(1)),
      carbs: Number((parsedResponse.total_carbs ?? 0).toFixed(1)),
      proteins: Number((parsedResponse.total_proteins ?? 0).toFixed(1)),
      fiber: Number((parsedResponse.total_fiber ?? 0).toFixed(1)),
      mealType: parsedResponse.mealType,
      details: parsedResponse.items,
      reasoning: parsedResponse.reasoning,
    })

  } catch (error) {
    console.error("Failed to analyze food:", error)
    return NextResponse.json({ error: "Failed to analyze food" }, { status: 500 })
  }
}
