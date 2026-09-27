import { test, expect } from '@playwright/test'

/** Matches the Supabase project ref in local env (storage key only, not a secret). */
const SUPABASE_AUTH_KEY = 'sb-bjwyjtncltperoiirz-auth-token'

function seedEmptyProfileWithLeftoverSession() {
  localStorage.clear()
  localStorage.setItem('welcomeComplete', 'true')
  localStorage.setItem('userEmail', 'stale@example.com')
  localStorage.setItem(
    SUPABASE_AUTH_KEY,
    JSON.stringify({
      access_token: 'stale-access-token',
      refresh_token: 'stale-refresh-token',
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      expires_in: 3600,
      token_type: 'bearer',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        aud: 'authenticated',
        email: 'stale@example.com',
      },
    })
  )
}

function seedReturningUser() {
  localStorage.setItem('welcomeComplete', 'true')
  localStorage.setItem('userEmail', 'test@example.com')

  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hgt-recorder', 4)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('userProfile')) {
        db.createObjectStore('userProfile', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('trails')) {
        const trails = db.createObjectStore('trails', { keyPath: 'id' })
        trails.createIndex('groupCode', 'groupCode')
        trails.createIndex('[groupCode+trailType]', ['groupCode', 'trailType'])
      }
      if (!db.objectStoreNames.contains('pois')) {
        const pois = db.createObjectStore('pois', { keyPath: 'id' })
        pois.createIndex('trailId', 'trailId')
        pois.createIndex('[trailId+sequence]', ['trailId', 'sequence'])
      }
      if (!db.objectStoreNames.contains('brochureSetup')) {
        db.createObjectStore('brochureSetup', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncQueue = db.createObjectStore('syncQueue', { keyPath: 'id' })
        syncQueue.createIndex('createdAt', 'createdAt')
        syncQueue.createIndex('syncedAt', 'syncedAt')
      }
    }
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(['userProfile', 'trails'], 'readwrite')
      const createdAt = new Date().toISOString()
      tx.objectStore('userProfile').put({
        id: 'default',
        email: 'test@example.com',
        name: 'Test User',
        groupName: 'Test Parish',
        groupCode: 'testparish',
        createdAt,
      })
      tx.objectStore('trails').put({
        id: 'testparish-graveyard',
        groupCode: 'testparish',
        trailType: 'graveyard',
        displayName: 'Test Parish Graveyard Trail',
        createdAt,
        nextSequence: 1,
      })
      tx.objectStore('trails').put({
        id: 'testparish-parish',
        groupCode: 'testparish',
        trailType: 'parish',
        displayName: 'Test Parish Parish Trail',
        createdAt,
        nextSequence: 1,
      })
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    }
  })
}

test('leftover session key and empty IndexedDB does not stay on Loading', async ({
  page,
}) => {
  await page.addInitScript(seedEmptyProfileWithLeftoverSession)
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 })

  await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0, {
    timeout: 10000,
  })

  const signIn = page.getByPlaceholder('Your first and last name')
  const loadedApp = page.getByRole('heading', { name: /welcome back/i })
  await expect(signIn.or(loadedApp)).toBeVisible()
})

test('returning user with a local profile loads the Trails screen', async ({
  page,
}) => {
  await page.addInitScript(seedReturningUser)
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 })

  await expect(
    page.getByRole('heading', { name: /welcome back, test user/i })
  ).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: 'Trails' })).toBeVisible()
  await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0)
})
