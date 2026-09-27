import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { AppLayout } from './AppLayout'
import { HideBottomNavProvider } from '../context/HideBottomNavContext'
import {
  clearWelcomeComplete,
  isWelcomeComplete,
} from '../utils/storage'
import { getUserProfile } from '../db/userProfile'

export function SetupGate() {
  const [complete, setComplete] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function verify() {
      if (!isWelcomeComplete()) {
        if (!cancelled) {
          setComplete(false)
          setReady(true)
        }
        return
      }

      const profile = await getUserProfile()
      if (cancelled) return

      if (!profile) {
        // Stale gate flag (e.g. welcomeComplete / auth leftovers) with empty
        // IndexedDB — send the user back to sign-in instead of hanging.
        clearWelcomeComplete()
        setComplete(false)
      } else {
        setComplete(true)
      }
      setReady(true)
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#f5f5f0] p-6">
        <p className="text-lg text-[#0b0c0c]">Loading...</p>
      </main>
    )
  }

  if (!complete) {
    return (
      <WelcomeScreen
        onComplete={() => {
          setComplete(true)
          navigate('/', { replace: true })
        }}
      />
    )
  }

  return (
    <HideBottomNavProvider>
      <AppLayout />
    </HideBottomNavProvider>
  )
}
