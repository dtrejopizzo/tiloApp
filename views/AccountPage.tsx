"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import type { AppState, User, ReminderConfig } from "../types"

interface AccountPageProps {
  state: AppState
  onUpdateUser: (userData: Partial<User>) => void
  initialSection?: "account" | "password" | "notifications"
}

const AccountPage: React.FC<AccountPageProps> = ({ state, onUpdateUser, initialSection = "account" }) => {
  const { user } = state
  const [activeSection, setActiveSection] = useState(initialSection)

  // Account section state
  const [name, setName] = useState(user?.name || "")
  const [avatar, setAvatar] = useState(user?.avatar || "")
  const [weight, setWeight] = useState(user?.weight?.toString() || "")
  const [height, setHeight] = useState(user?.height?.toString() || "")
  const [age, setAge] = useState(user?.age?.toString() || "")
  const [gender, setGender] = useState<User["gender"]>(user?.gender || "male")
  const [targetCalories, setTargetCalories] = useState(user?.targetCalories?.toString() || "")
  const [targetWater, setTargetWater] = useState(user?.targetWater?.toString() || "")

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  // Notifications state
  const [reminders, setReminders] = useState<ReminderConfig[]>(user?.reminders || [])

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-calculated values
  const [bmr, setBmr] = useState<number | null>(null)
  const [bmi, setBmi] = useState<number | null>(null)

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  useEffect(() => {
    const w = Number.parseFloat(weight)
    const h = Number.parseFloat(height)
    const a = Number.parseInt(age)

    if (w > 0 && h > 0 && a > 0) {
      const hMetres = h / 100
      setBmi(w / (hMetres * hMetres))

      let calculatedBmr = 10 * w + 6.25 * h - 5 * a
      if (gender === "male") {
        calculatedBmr += 5
      } else {
        calculatedBmr -= 161
      }
      setBmr(calculatedBmr)

      if (!targetCalories) {
        setTargetCalories(Math.round(calculatedBmr * 1.2).toString())
      }
      if (!targetWater) {
        setTargetWater(Math.round(w * 33).toString())
      }
    } else {
      setBmi(null)
      setBmr(null)
    }
  }, [weight, height, age, gender])

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateUser({
      name,
      avatar,
      weight: Number.parseFloat(weight),
      height: Number.parseFloat(height),
      age: Number.parseInt(age),
      gender,
      targetCalories: Number.parseInt(targetCalories),
      targetWater: Number.parseInt(targetWater),
    })
  }

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordStatus({ type: "error", msg: "All password fields are required." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: "error", msg: "New passwords do not match." })
      return
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: "error", msg: "Password must be at least 6 characters." })
      return
    }

    setPasswordStatus({ type: "success", msg: "Password updated successfully!" })
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setTimeout(() => setPasswordStatus(null), 3000)
  }

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateUser({ reminders })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const updateReminder = (id: string, updates: Partial<ReminderConfig>) => {
    const newReminders = reminders.map((r) => (r.id === id ? { ...r, ...updates } : r))
    setReminders(newReminders)
  }

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: "Underweight", color: "text-bondiblue" }
    if (val < 25) return { label: "Healthy", color: "text-emeraldcustom" }
    if (val < 30) return { label: "Overweight", color: "text-cerulean" }
    return { label: "Obese", color: "text-yaleblue" }
  }

  const tabs = [
    { id: "account", label: "Account" },
    { id: "password", label: "Password" },
    { id: "notifications", label: "Notifications" },
  ]

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <header>
        <h2 className="text-3xl font-bold text-yaleblue">Account Settings</h2>
        <p className="text-muted-foreground">Manage your profile, security, and notification preferences.</p>
      </header>

      {/* Tabs */}
      <div className="bg-card rounded-none shadow-sm border border-border p-2">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 px-4 py-3 rounded-none font-medium transition-all ${
                activeSection === tab.id ? "bg-cerulean text-white shadow-sm" : "text-muted-foreground hover:bg-background"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Account Section */}
      {activeSection === "account" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card p-6 rounded-none shadow-sm border border-border">
              <h3 className="text-xl font-bold text-yaleblue mb-6">User Profile</h3>
              <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8 mb-8">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-32 h-32 rounded-full bg-secondary flex items-center justify-center text-muted-foreground font-bold text-4xl overflow-hidden border-4 border-white shadow-lg">
                    {avatar ? (
                      <img src={avatar || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0) || "U"
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-sm font-bold text-foreground mb-2">Display Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all text-lg font-semibold text-yaleblue"
                    placeholder="Your Name"
                  />
                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                    This is how you'll be addressed across Tilo App.
                  </p>
                </div>
              </div>

              <hr className="my-8 border-border" />

              <h3 className="text-xl font-bold text-yaleblue mb-6">Physical Profile</h3>
              <form onSubmit={handleSaveAccount} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all"
                      placeholder="e.g. 25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all"
                      placeholder="e.g. 70"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Height (cm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all"
                      placeholder="e.g. 175"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <h3 className="text-xl font-bold text-yaleblue mb-6 flex items-center">
                    <span className="mr-2">Goals & Daily Targets</span>
                    <span className="text-[10px] bg-limecream text-yaleblue px-2 py-0.5 rounded-full uppercase tracking-widest font-black">
                      Intelligent Suggestions
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Calorie Target (kcal)</label>
                      <input
                        type="number"
                        value={targetCalories}
                        onChange={(e) => setTargetCalories(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                        Estimated for sedentary lifestyle: {bmr ? Math.round(bmr * 1.2) : "--"} kcal
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-foreground mb-2">Water Target (ml)</label>
                      <input
                        type="number"
                        value={targetWater}
                        onChange={(e) => setTargetWater(e.target.value)}
                        className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-cerulean outline-none transition-all"
                      />
                      <p className="text-[10px] text-muted-foreground mt-2 font-medium">
                        Suggested based on weight: {weight ? Math.round(Number.parseFloat(weight) * 33) : "--"} ml
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-cerulean text-white py-4 rounded-none font-bold hover:bg-balticblue transition-all shadow-lg shadow-cerulean/20 mt-4 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>

          {/* Health Insights Sidebar */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-none shadow-sm border border-border sticky top-8">
              <h3 className="text-lg font-bold text-yaleblue mb-4">Your Health Insights</h3>

              <div className="space-y-6">
                <div className="p-5 bg-background rounded-none border border-border shadow-inner">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">BMI Index</p>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-4xl font-black text-yaleblue tracking-tighter">
                      {bmi ? bmi.toFixed(1) : "--.-"}
                    </span>
                    {bmi && (
                      <span
                        className={`text-xs font-black uppercase px-2 py-0.5 rounded-none bg-card shadow-sm border border-border ${getBmiCategory(bmi).color}`}
                      >
                        {getBmiCategory(bmi).label}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 bg-background rounded-none border border-border shadow-inner">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                    Base Metabolism
                  </p>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-4xl font-black text-yaleblue tracking-tighter">
                      {bmr ? Math.round(bmr) : "----"}
                    </span>
                    <span className="text-sm font-bold text-muted-foreground">kcal/day</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Section */}
      {activeSection === "password" && (
        <div className="max-w-2xl">
          <div className="bg-card p-6 rounded-none shadow-sm border border-border">
            <h3 className="text-xl font-bold text-yaleblue mb-6">Change Password</h3>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-bondiblue outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-bondiblue outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-border rounded-none focus:ring-2 focus:ring-bondiblue outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {passwordStatus && (
                <div
                  className={`p-3 rounded-none text-sm font-bold ${passwordStatus.type === "success" ? "bg-emeraldcustom/10 text-emeraldcustom" : "bg-red-500/10 text-red-400"}`}
                >
                  {passwordStatus.msg}
                </div>
              )}

              <button
                type="submit"
                className="bg-balticblue text-white px-8 py-3 rounded-none font-bold hover:bg-yaleblue transition-all shadow-md active:scale-[0.98]"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notifications Section */}
      {activeSection === "notifications" && (
        <div className="max-w-3xl">
          <div className="bg-card p-6 rounded-none shadow-sm border border-border">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-yaleblue">Intelligent Reminders</h3>
                <p className="text-xs text-muted-foreground">Automate your health and productivity prompts.</p>
              </div>
            </div>

            <form onSubmit={handleSaveNotifications} className="space-y-4">
              {reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center justify-between p-4 bg-background rounded-none border border-border hover:border-lightgreen transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${reminder.enabled ? "bg-cerulean/10 text-cerulean" : "bg-muted text-muted-foreground"}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-yaleblue">{reminder.label}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">{reminder.frequency}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {reminder.enabled && (
                      <input
                        type="time"
                        value={reminder.time}
                        onChange={(e) => updateReminder(reminder.id, { time: e.target.value })}
                        className="bg-card border border-border rounded-none px-2 py-1 text-xs font-bold text-yaleblue outline-none focus:ring-2 focus:ring-cerulean"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => updateReminder(reminder.id, { enabled: !reminder.enabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${reminder.enabled ? "bg-emeraldcustom" : "bg-muted"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${reminder.enabled ? "translate-x-6" : "translate-x-1"}`}
                      />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="submit"
                className="w-full bg-cerulean text-white py-4 rounded-none font-bold hover:bg-balticblue transition-all shadow-lg shadow-cerulean/20 mt-4 active:scale-[0.98]"
              >
                Save Notification Preferences
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AccountPage
