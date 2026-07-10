import { test, expect } from '@playwright/test';

test('POS: login → scan → sale → receipt', async ({ page }) => {
  // 1. Login (Super Admin, seed creds already default-filled)
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('admin@laptophub.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

  // 2. POS pe jao
  await page.goto('/pos');

  // Branch chunein (Super Admin ke paas dropdown hai)
  const branchSelect = page.locator('select').first();
  await branchSelect.selectOption({ label: 'Main Branch' });

  // 3. Item search karke cart mein add karo — broad term jo aksar stock mein hota hai
  const searchBox = page.getByPlaceholder('Serial scan ya model/SKU search karein…');
  await searchBox.fill('Smoke');
  await expect(page.locator('li').filter({ hasText: 'Smoke' }).first()).toBeVisible({
    timeout: 10000,
  });
  await page.locator('li').filter({ hasText: 'Smoke' }).first().click();

  // 4. Price bharo — koi bhi round number
  const priceInput = page.locator('[data-testid^="cart-price-"]').first();
  await priceInput.fill('50000');

  // 5. Total ab jo bhi bana (price × quantity), wahi payment mein daalo —
  //    isse quantity 1 ho ya 10, payment hamesha sahi rahega
  const totalText = await page.getByTestId('pos-summary-total').innerText();
  const totalAmount = totalText.replace(/[^\d]/g, ''); // "Rs 50,000" -> "50000"

  await page.getByPlaceholder('Amount').fill(totalAmount);
  await page.getByTestId('add-payment-button').click();

  // Due Rs 0 confirm karo
  await expect(
    page.locator('span.text-green-600', { hasText: 'Rs 0' })
  ).toBeVisible();

  // 6. Complete Sale
  await page.getByTestId('complete-sale-button').click();

  // 7. Receipt dialog khulni chahiye
  await expect(page.getByText('Receipt')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/INV-\d{4}-\d{4}/)).toBeVisible();
});