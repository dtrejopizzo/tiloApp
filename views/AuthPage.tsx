"use client"

import type React from "react"
import { useState } from "react"
import { signIn, signUp, signInWithGoogle } from "@/services/authService"
import { Loader2 } from "lucide-react"

interface AuthPageProps {
  onLogin: () => void
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isLogin) {
        await signIn(email, password)
      } else {
        if (!name.trim()) {
          setError("Please enter your name")
          setLoading(false)
          return
        }
        await signUp(email, password, name)
      }
      onLogin()
    } catch (err: any) {
      console.error("Auth error:", err)
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email")
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password")
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists")
      } else if (err.code === "auth/weak-password") {
        setError("Password should be at least 6 characters")
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address")
      } else if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password")
      } else {
        setError("An error occurred. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)
    try {
      await signInWithGoogle()
      onLogin()
    } catch (err: any) {
      console.error("Google sign in error:", err)
      setError("Failed to sign in with Google")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      {/* Left Column – Form */}
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-background">
        {/* Logo */}
        <div className="flex justify-center lg:justify-start mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary flex size-8 items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 14V8" stroke="white" strokeWidth="1.5" strokeLinecap="square"/>
                <path d="M8 11C7.5 11 4 9.5 4 6C4 6 7.5 4.5 11 7C12.5 8.5 11.5 11 8 11Z" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-lg text-foreground tracking-wide">Tilo</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isLogin ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isLogin
                  ? "Sign in to your account to continue"
                  : "Sign up to get started with Tilo"}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors text-sm"
                    required={!isLogin}
                    placeholder="John Doe"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors text-sm"
                  required
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors text-sm"
                  required
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-2.5 font-semibold transition-all border border-primary/50 hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center text-sm"
                style={{ boxShadow: "0 4px 12px rgba(16,185,129,0.3)" }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isLogin ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border"></div>
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 border-t border-border"></div>
            </div>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 border border-border bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Toggle */}
            <div className="text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError("") }}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column – Decorative */}
      <div className="relative hidden lg:flex items-center justify-center bg-accent border-l border-border">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{
          backgroundImage: "linear-gradient(#10b981 1px, transparent 1px), linear-gradient(90deg, #10b981 1px, transparent 1px)",
          backgroundSize: "60px 60px"
        }}></div>

        {/* Orange glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 blur-3xl"></div>

        {/* Content */}
        <div className="relative z-10 px-12 text-center">
          <div className="inline-flex items-center gap-2 border border-primary/30 bg-primary/10 px-4 py-1.5 mb-8">
            <div className="w-1.5 h-1.5 bg-primary"></div>
            <span className="text-primary text-xs font-medium tracking-widest uppercase">Personal OS</span>
          </div>
          <h2 className="text-4xl font-bold text-foreground mb-5 leading-tight">
            Track.<br/>Improve.<br/>Thrive.
          </h2>
          <p className="text-muted-foreground mb-10 max-w-xs mx-auto text-sm leading-relaxed">
            Manage your tasks, habits, nutrition, health, and productivity — all in one place.
          </p>
          <div className="flex flex-col gap-4 text-left max-w-xs mx-auto">
            {[
              { label: "Tasks & Habits", desc: "Stay on top of your goals daily" },
              { label: "Nutrition & Sports", desc: "Track your health journey" },
              { label: "AI Coach", desc: "Smart insights & recommendations" },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 items-start p-3 border border-border bg-card">
                <div className="w-1 h-1 bg-primary mt-1.5 flex-shrink-0"></div>
                <div>
                  <p className="text-foreground font-medium text-sm">{item.label}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage
