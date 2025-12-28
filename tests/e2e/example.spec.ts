import { test, expect } from '@playwright/test'

test('homepage has correct title and content', async ({ page }) => {
  await page.goto('/')

  // Check title
  await expect(page).toHaveTitle(/Iconic Website/)

  // Check main heading
  await expect(page.getByRole('heading', { name: /Iconic Website/ })).toBeVisible()
})

test('dashboard page is accessible', async ({ page }) => {
  await page.goto('/dashboard')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})
