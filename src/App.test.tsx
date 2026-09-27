import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { db } from './db/database'
import { createUserProfile } from './db/userProfile'
import { createTrail } from './db/trails'

async function resetDb() {
  await db.delete()
  await db.open()
}

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear()
    await resetDb()
  })

  it('with session present and empty userProfile reaches sign-in, not Loading', async () => {
    // Leftover session-shaped localStorage (welcomeComplete / auth token) with
    // empty IndexedDB userProfile must not stick on Loading...
    localStorage.setItem('welcomeComplete', 'true')
    localStorage.setItem(
      'sb-example-auth-token',
      JSON.stringify({ access_token: 'stale', user: { id: 'x' } })
    )

    render(<App />)

    await waitFor(
      () => {
        expect(
          screen.getByPlaceholderText(/your first and last name/i)
        ).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    expect(screen.queryByText(/^Loading\.\.\.$/)).not.toBeInTheDocument()
  })

  it('with a valid userProfile loads the Trails (home) screen', async () => {
    localStorage.setItem('welcomeComplete', 'true')
    const profile = await createUserProfile({
      email: 'test@example.com',
      name: 'Test User',
      groupName: 'Test Parish',
      groupCode: 'testparish',
    })
    await createTrail({
      groupCode: profile.groupCode,
      trailType: 'graveyard',
      displayName: 'Test Parish Graveyard Trail',
    })
    await createTrail({
      groupCode: profile.groupCode,
      trailType: 'parish',
      displayName: 'Test Parish Parish Trail',
    })

    render(<App />)

    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /welcome back, test user/i })
        ).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
    expect(screen.queryByText(/^Loading\.\.\.$/)).not.toBeInTheDocument()
  })
})
