"use client"

import { AuthProvider } from "../../components/AuthProvider"
import App from "../../App"

export default function Page() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}
