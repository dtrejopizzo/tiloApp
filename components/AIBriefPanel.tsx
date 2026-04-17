"use client"

import type React from "react"
import { Sparkles, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react"
import type { DailyBrief, AIInsight } from "../services/aiAgentService"

interface AIBriefPanelProps {
  brief: DailyBrief
}

const AIBriefPanel: React.FC<AIBriefPanelProps> = ({ brief }) => {
  const getInsightIcon = (type: AIInsight["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-4 h-4" style={{ color: "#b5e48c" }} />
      case "warning":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case "info":
        return <Sparkles className="w-4 h-4" style={{ color: "#10b981" }} />
      case "motivation":
        return <Sparkles className="w-4 h-4" style={{ color: "#059669" }} />
    }
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(26, 117, 159, 0.1), rgba(52, 160, 164, 0.1))",
        borderColor: "rgba(26, 117, 159, 0.2)",
      }}
      className="rounded-none p-6 border"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-5 h-5" style={{ color: "#10b981" }} />
            <h3 className="text-lg font-bold" style={{ color: "#0a0a0a" }}>
              Your AI Coach
            </h3>
          </div>
          <p className="text-sm text-muted-foreground italic">{brief.motivation}</p>
        </div>
      </div>

      {/* Calorie Balance */}
      <div className="bg-card/60 rounded-none p-4 mb-4">
        <h4 className="text-sm font-bold mb-3" style={{ color: "#0a0a0a" }}>
          Today's Energy Balance
        </h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Consumed</p>
            <p className="text-lg font-bold" style={{ color: "#0a0a0a" }}>
              {Math.round(brief.calorieBalance.consumed)}
            </p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Burned</p>
            <p className="text-lg font-bold" style={{ color: "#0a0a0a" }}>
              {Math.round(brief.calorieBalance.burned)}
            </p>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Net</p>
            <div className="flex items-center justify-center space-x-1">
              {brief.calorieBalance.netBalance > 0 ? (
                <TrendingUp className="w-4 h-4" style={{ color: "#34d399" }} />
              ) : (
                <TrendingDown className="w-4 h-4" style={{ color: "#b5e48c" }} />
              )}
              <p
                className="text-lg font-bold"
                style={{ color: brief.calorieBalance.netBalance > 0 ? "#34d399" : "#b5e48c" }}
              >
                {Math.abs(Math.round(brief.calorieBalance.netBalance))}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">kcal</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Base: {Math.round(brief.calorieBalance.basalMetabolism)} + Exercise:{" "}
          {Math.round(brief.calorieBalance.exerciseBurn)} kcal
        </p>
      </div>

      {/* Insights */}
      <div className="space-y-2 mb-4">
        {brief.insights.slice(0, 3).map((insight, idx) => (
          <div key={idx} className="bg-card/60 rounded-none p-3 flex items-start space-x-2">
            {getInsightIcon(insight.type)}
            <p className="text-xs text-foreground flex-1">{insight.message}</p>
          </div>
        ))}
      </div>

      {/* Priorities */}
      {brief.priorities.length > 0 && (
        <div className="bg-card/60 rounded-none p-3">
          <h4 className="text-xs font-bold mb-2" style={{ color: "#0a0a0a" }}>
            Today's Priorities
          </h4>
          <ul className="space-y-1">
            {brief.priorities.map((priority, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#10b981" }}></span>
                <span>{priority}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default AIBriefPanel
