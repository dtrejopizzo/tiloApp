"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Sparkles, Send, X, Minimize2, Maximize2, Copy, Check, Mic } from "lucide-react"

interface FloatingAIChatProps {
  onAskAI: (prompt: string) => Promise<string>
}

const FloatingAIChat: React.FC<FloatingAIChatProps> = ({ onAskAI }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState<number | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const handleSend = async () => {
    if (!prompt.trim() || loading) return

    const userMessage = prompt.trim()
    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setPrompt("")
    setLoading(true)

    try {
      const response = await onAskAI(userMessage)
      setMessages((prev) => [...prev, { role: "ai", content: response }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Sorry, I had trouble processing your request. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = (index: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(index)
    setTimeout(() => setCopied(null), 2000)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      const audioChunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
        const formData = new FormData()
        formData.append("audio", audioBlob)

        try {
          const response = await fetch("/api/transcribe-audio", {
            method: "POST",
            body: formData,
          })
          const { text } = await response.json()
          setPrompt(text)
        } catch (error) {
          console.error("Transcription error:", error)
        }

        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)
    } catch (error) {
      console.error("Recording error:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const formatMessage = (content: string) => {
    return content
      .replace(/###\s+/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim()
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-primary text-primary-foreground p-3.5 border border-primary/50 z-50 transition-all hover:bg-primary/90"
        style={{ boxShadow: "0 0 20px rgba(16,185,129,0.4), 0 4px 12px rgba(0,0,0,0.15)" }}
      >
        <Sparkles className="w-5 h-5" />
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-6 right-6 bg-card border border-border z-50 transition-all duration-300 ${
        isMinimized ? "w-80 h-12" : "w-[380px] h-[580px]"
      } flex flex-col`}
      style={{ boxShadow: "0 0 0 1px rgba(16,185,129,0.15), 0 16px 48px rgba(0,0,0,0.12)" }}
    >
      {/* Header */}
      <div className="h-12 bg-background border-b border-border px-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-xs text-foreground tracking-wide">AI Coach</h3>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-foreground">Ask me anything about</p>
                  <p className="text-xs text-muted-foreground mt-1">health, productivity, or lifestyle</p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 border text-sm ${
                    msg.role === "user"
                      ? "bg-primary/15 text-foreground border-primary/30"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {msg.role === "ai" && (
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-primary">AI Coach</span>
                      <button
                        onClick={() => handleCopy(idx, msg.content)}
                        className="text-muted-foreground hover:text-foreground transition-colors ml-2"
                      >
                        {copied === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{formatMessage(msg.content)}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border px-4 py-3">
                  <div className="flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-primary animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-primary animate-bounce delay-100"></div>
                    <div className="w-1.5 h-1.5 bg-primary animate-bounce delay-200"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 flex space-x-2 bg-background flex-shrink-0">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask your AI coach..."
              className="flex-1 px-3 py-2 text-sm border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              disabled={loading}
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 border transition-all text-sm ${
                isRecording
                  ? "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse"
                  : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-border/80"
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={loading || !prompt.trim()}
              className="bg-primary text-primary-foreground p-2 border border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default FloatingAIChat
