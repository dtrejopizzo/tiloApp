"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog"
import { Button } from "./ui/button"
import { addFeedback } from "@/services/firestoreService"
import { useAuth } from "./AuthProvider"

interface FeedbackModalProps {
  onClose: () => void
}

export function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { user } = useAuth()
  const [feedbackType, setFeedbackType] = useState<"bug" | "feature">("bug")
  const [description, setDescription] = useState("")
  const [images, setImages] = useState<File[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setImages((prev) => [...prev, ...newFiles].slice(0, 3)) // Máximo 3 imágenes
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!user) {
      alert("You must be logged in to send feedback")
      return
    }

    if (!description.trim()) {
      alert("Please describe your feedback")
      return
    }

    setIsSubmitting(true)
    try {
      const imageUrls: string[] = []
      for (const image of images) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(image)
        })
        imageUrls.push(base64)
      }

      await addFeedback({
        userId: user.uid,
        type: feedbackType,
        description: description.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
      })

      alert("Thank you for your feedback!")

      setDescription("")
      setImages([])
      setFeedbackType("bug")
      onClose()
    } catch (error) {
      console.error("[v0] Error submitting feedback:", error)
      alert("Error submitting feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>Help us improve Tilo by reporting issues or requesting features</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-yaleblue">Feedback Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFeedbackType("bug")}
                className={`flex-1 px-3 py-2 rounded-none border-2 transition-colors ${
                  feedbackType === "bug"
                    ? "border-cerulean bg-cerulean bg-opacity-10 text-cerulean"
                    : "border-border hover:border-border"
                }`}
              >
                Bug Report
              </button>
              <button
                onClick={() => setFeedbackType("feature")}
                className={`flex-1 px-3 py-2 rounded-none border-2 transition-colors ${
                  feedbackType === "feature"
                    ? "border-cerulean bg-cerulean bg-opacity-10 text-cerulean"
                    : "border-border hover:border-border"
                }`}
              >
                Feature Request
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-yaleblue">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or feature you'd like to request..."
              className="w-full px-3 py-2 border border-border rounded-none focus:outline-none focus:ring-2 focus:ring-cerulean resize-none"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-yaleblue">Attach Images (Optional, max 3)</label>
            <div className="border-2 border-dashed border-border rounded-none p-4 text-center hover:border-cerulean transition-colors">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-input"
                disabled={images.length >= 3}
              />
              <label htmlFor="image-input" className="cursor-pointer block text-sm text-muted-foreground hover:text-cerulean">
                Click to upload images or drag and drop
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image) || "/placeholder.svg"}
                      alt={`Preview ${index}`}
                      className="w-full h-20 object-cover rounded-none"
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description.trim()}
            className="bg-cerulean hover:bg-cerulean-hover text-white"
          >
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default FeedbackModal
