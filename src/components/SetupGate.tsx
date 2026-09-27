import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WelcomeScreen } from '../screens/WelcomeScreen'
import { AppLayout } from './AppLayout'
import { HideBottomNavProvider } from '../context/HideBottomNavContext'
import {
  clearStoredUserEmail,
  clearWelcomeComplete,
} from '../utils/storage'
import { getUserProfile } from '../db/userProfile'

export function SetupGate() {
  const [ready, setReady] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function verify() {
      try {
        const profile = await getUserProfile()
        if (cancelled) return
        if (!profile) {
          clearWelcomeComplete()
          clearStoredUserEmail()
          setHasProfile(false)
        } else {
          setHasProfile(true)
        }
      } catch {
        if (cancelled) return
        clearWelcomeComplete()
        clearStoredUserEmail()
        setHasProfile(false)
      } finally {
        if (!cancelled) setReady(true)
      }
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

  if (!hasProfile) {
    return (
      <WelcomeScreen
        onComplete={() => {
          setHasProfile(true)
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
