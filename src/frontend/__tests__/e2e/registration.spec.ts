import { test, expect } from '@playwright/test';

test.describe('User Registration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page
    await page.goto('http://localhost:3000');
  });

  test('should complete full registration flow from home page', async ({
    page,
  }) => {
    // Click "Get Started" button on home page
    await page.click('text=Get Started');

    // Should navigate to registration page
    await expect(page).toHaveURL('http://localhost:3000/register');

    // Verify registration form is visible
    await expect(
      page.getByRole('heading', { name: /create your account/i })
    ).toBeVisible();

    // Generate unique email for this test run
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'TestPassword123';

    // Fill in registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.getByText(/registration successful/i)).toBeVisible({
      timeout: 5000,
    });

    // Verify token was stored in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    expect(token).toContain('eyJ'); // JWT tokens start with 'eyJ'
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Navigate directly to registration page
    await page.goto('http://localhost:3000/register');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();

    // Fill in invalid email
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', 'short');
    await page.click('button[type="submit"]');

    // Should show format errors
    await expect(
      page.getByText(/please enter a valid email address/i)
    ).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('should handle duplicate email error', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    // First registration
    const timestamp = Date.now();
    const testEmail = `duplicate${timestamp}@example.com`;
    const testPassword = 'TestPassword123';

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page.getByText(/registration successful/i)).toBeVisible({
      timeout: 5000,
    });

    // Try to register again with same email
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should show duplicate error
    await expect(page.getByText(/email already exists/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should navigate to login page via link', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    // Click the "Sign in" link
    await page.click('text=Sign in');

    // Should navigate to login page
    await expect(page).toHaveURL('http://localhost:3000/login');
  });

  test('should disable submit button while submitting', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    const timestamp = Date.now();
    const testEmail = `buttontest${timestamp}@example.com`;

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'TestPassword123');

    // Get reference to submit button
    const submitButton = page.locator('button[type="submit"]');

    // Click submit
    await submitButton.click();

    // Button should be disabled immediately
    await expect(submitButton).toBeDisabled();

    // Wait for completion
    await expect(page.getByText(/registration successful/i)).toBeVisible({
      timeout: 5000,
    });

    // Button should be enabled again
    await expect(submitButton).toBeEnabled();
  });
});
