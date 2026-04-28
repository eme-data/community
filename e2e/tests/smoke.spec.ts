import { test, expect } from '@playwright/test';

/**
 * Golden path smoke test:
 *   visitor → landing → register → onboarding (auto-verify in dev) → connect skip → dashboard
 *
 * Prereqs:
 *   - The full stack is up at E2E_BASE_URL (default http://localhost:3000)
 *   - SMTP is NOT configured in the env (so verification is automatic)
 */
test('signup → onboarding → dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.getByRole('link', { name: /Démarrer gratuitement/i }).first().click();
  await expect(page).toHaveURL(/\/register$/);

  const slug = `e2e-${Date.now()}`;
  const email = `${slug}@example.com`;

  await page.getByPlaceholder("Nom de l'organisation").fill('E2E Org');
  await page.getByPlaceholder('slug-url-unique').fill(slug);
  await page.getByPlaceholder('Nom complet').fill('E2E Tester');
  await page.getByPlaceholder('email@exemple.com').fill(email);
  await page.getByPlaceholder(/Mot de passe/).fill('correcthorsebatterystaple');
  await page.getByRole('button', { name: /Créer/ }).click();

  // Onboarding entry routes us forward; without SMTP the email auto-verifies.
  await expect(page).toHaveURL(/\/onboarding/);

  // The "verify" step renders even without a real email — click "Continuer"
  // (the button label switches to "Continuer" when mail is disabled).
  const continueBtn = page.getByRole('button', { name: /Continuer|Renvoyer/ });
  if (await continueBtn.count()) {
    await continueBtn.first().click();
  }

  // Connect step — skip
  await page.waitForURL(/\/onboarding\/(connect|done)/);
  const skipBtn = page.getByRole('button', { name: /Sauter pour l'instant/ });
  if (await skipBtn.count()) {
    await skipBtn.first().click();
  }

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'E2E Org' })).toBeVisible();
});
