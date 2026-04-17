export const nutritionAI = {
  analyzeFood: async (description: string) => {
    try {
      const response = await fetch("/api/analyze-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ description }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze food")
      }

      return await response.json()
    } catch (error) {
      console.error("Failed to analyze food:", error)
      return null
    }
  },
}
