import { test, expect } from '@playwright/test'

test.describe('Provider Onboarding Redirects', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test with a fresh session
    await page.context().clearCookies()
    await page.goto('/')
  })

  test('Case A: Provider with not_started onboarding logs in → lands on /provider/onboarding', async ({ page }) => {
    // This test would require setting up a test database with a provider user
    // For now, we'll test the flow conceptually
    
    await page.goto('/auth/sign-in')
    
    // Fill in test provider credentials (would need test user setup)
    await page.fill('input[type="email"]', 'provider-incomplete@test.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    
    // Should redirect to onboarding for incomplete provider
    await expect(page).toHaveURL(/\/provider\/onboarding/)
    
    // Should see onboarding steps
    await expect(page.locator('text=Provider Onboarding')).toBeVisible()
    await expect(page.locator('text=Step 1')).toBeVisible()
  })

  test('Case B: Provider completes onboarding → status completed → logout → login again → lands on /provider/dashboard', async ({ page }) => {
    // This would test the full onboarding completion flow
    
    await page.goto('/auth/sign-in')
    
    // Sign in as incomplete provider
    await page.fill('input[type="email"]', 'provider-test@test.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    
    // Should be on onboarding
    await expect(page).toHaveURL(/\/provider\/onboarding/)
    
    // Complete step 1 (would need form filling)
    await page.fill('input[name="businessName"]', 'Test Beauty Salon')
    await page.fill('input[name="addressLine1"]', '123 Test Street')
    await page.fill('input[name="city"]', 'Test City')
    await page.fill('input[name="state"]', 'TS')
    await page.fill('input[name="zip"]', '12345')
    await page.fill('textarea[name="bio"]', 'A great beauty salon for testing purposes with quality services')
    await page.click('button[type="submit"]')
    
    // Should advance to step 2 (Stripe)
    await expect(page.locator('text=Payment Setup')).toBeVisible()
    
    // Simulate Stripe Connect (would click through Stripe flow)
    await page.click('button:has-text("Connect with Stripe")')
    
    // Should advance to step 3 (Services)
    await expect(page.locator('text=Add Your First Service')).toBeVisible()
    
    // Add a service
    await page.fill('input[name="title"]', 'Test Haircut')
    await page.selectOption('select[name="categoryId"]', { index: 1 })
    await page.fill('textarea[name="description"]', 'Professional haircut service for testing')
    await page.fill('input[name="durationMinutes"]', '60')
    await page.fill('input[name="price"]', '50.00')
    await page.click('button[type="submit"]')
    
    // Should advance to step 4 (Availability)
    await expect(page.locator('text=Set Your Availability')).toBeVisible()
    
    // Set availability
    await page.check('input[id="monday"]')
    await page.check('input[id="tuesday"]')
    
    // Complete onboarding
    await page.click('button:has-text("Complete Onboarding")')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/provider\/dashboard/)
    await expect(page.locator('text=Provider Dashboard')).toBeVisible()
    
    // Now test logout and login again
    await page.click('button:has-text("Sign Out")')
    await expect(page).toHaveURL('/')
    
    // Log in again
    await page.goto('/auth/sign-in')
    await page.fill('input[type="email"]', 'provider-test@test.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    
    // Should land directly on dashboard now
    await expect(page).toHaveURL(/\/provider\/dashboard/)
  })

  test('Case C: Completed provider trying to hit /provider/onboarding → redirected to /provider/dashboard', async ({ page }) => {
    // Sign in as completed provider
    await page.goto('/auth/sign-in')
    await page.fill('input[type="email"]', 'provider-complete@test.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    
    // Should land on dashboard
    await expect(page).toHaveURL(/\/provider\/dashboard/)
    
    // Try to access onboarding directly
    await page.goto('/provider/onboarding')
    
    // Should be redirected back to dashboard
    await expect(page).toHaveURL(/\/provider\/dashboard/)
    await expect(page.locator('text=Provider Dashboard')).toBeVisible()
  })

  test('Client role trying to access provider routes → redirected to client dashboard', async ({ page }) => {
    // Sign in as client
    await page.goto('/auth/sign-in')
    await page.fill('input[type="email"]', 'client@test.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    
    // Should land on client dashboard
    await expect(page).toHaveURL(/\/client\/dashboard/)
    
    // Try to access provider routes
    await page.goto('/provider/dashboard')
    
    // Should be redirected back to client dashboard
    await expect(page).toHaveURL(/\/client\/dashboard/)
  })

  test('Provider role trying to access client routes → redirected to provider dashboard', async ({ page }) => {
    // Sign in as completed provider
    await page.goto('/auth/sign-in')
    await page.fill('input[type="email"]', 'provider-complete@test.com')
    await page.fill('input[type="password"]', 'testpass123')
    await page.click('button[type="submit"]')
    
    // Should land on provider dashboard
    await expect(page).toHaveURL(/\/provider\/dashboard/)
    
    // Try to access client routes
    await page.goto('/client/dashboard')
    
    // Should be redirected back to provider dashboard
    await expect(page).toHaveURL(/\/provider\/dashboard/)
  })

  test('Anonymous user trying to access protected routes → redirected to sign-in', async ({ page }) => {
    // Try to access provider dashboard without authentication
    await page.goto('/provider/dashboard')
    
    // Should be redirected to sign-in with redirect parameter
    await expect(page).toHaveURL(/\/auth\/sign-in/)
    await expect(page.url()).toContain('redirect=%2Fprovider%2Fdashboard')
    
    // Try to access client dashboard without authentication
    await page.goto('/client/dashboard')
    
    // Should be redirected to sign-in with redirect parameter
    await expect(page).toHaveURL(/\/auth\/sign-in/)
    await expect(page.url()).toContain('redirect=%2Fclient%2Fdashboard')
  })

  test('Public routes remain accessible to anonymous users', async ({ page }) => {
    // Landing page should be accessible
    await page.goto('/')
    await expect(page.locator('text=Welcome to Beauty Book')).toBeVisible()
    
    // Providers search should be accessible
    await page.goto('/providers')
    // Should not redirect to auth
    await expect(page).toHaveURL('/providers')
    
    // Auth pages should be accessible
    await page.goto('/auth/sign-up')
    await expect(page).toHaveURL('/auth/sign-up')
    
    await page.goto('/auth/sign-in')
    await expect(page).toHaveURL('/auth/sign-in')
  })
})

// Test helpers for setting up test data
test.describe('Provider Onboarding Status Management', () => {
  test('Manual onboarding status flip for testing', async ({ page }) => {
    // This test documents how to manually flip a provider to 'completed' status for testing
    // In a real environment, you would run SQL commands against your test database
    
    /*
    SQL commands to manually set onboarding status for testing:
    
    -- Mark provider as completed (after migration is applied)
    UPDATE provider_profiles 
    SET onboarding_status = 'completed',
        stripe_connect_id = 'acct_test_complete',
        subscription_status = 'active'
    WHERE provider_id = 'test-provider-user-id';
    
    -- Ensure they have a service
    INSERT INTO services (provider_id, category_id, title, description, duration_minutes, price_cents)
    VALUES ('test-provider-user-id', 'category-id', 'Test Service', 'Test description', 60, 5000);
    
    -- Ensure they have availability
    INSERT INTO availability_rules (provider_id, weekday, start_time, end_time, is_active)
    VALUES ('test-provider-user-id', 1, '09:00', '17:00', true);
    
    -- Mark as not started for testing incomplete flow
    UPDATE provider_profiles 
    SET onboarding_status = 'not_started',
        stripe_connect_id = NULL,
        subscription_status = 'inactive'
    WHERE provider_id = 'test-provider-user-id';
    */
    
    expect(true).toBe(true) // Placeholder test
  })
})