import { test, expect } from '@playwright/test';

test('POS: login → scan → sale → receipt', async ({ page, request }) => {
  // 0. Pehle login karke token lo (API se seedha), taake test-item bana sakein
  const loginRes = await request.post('http://localhost:3000/auth/login', {
    data: { email: 'rkstechware@gmail.com', password: 'password123' },
  });
  const { accessToken } = await loginRes.json();

  // 1. Ek guaranteed-fresh stock item banao (unique serial, quantity 1)
  //    taake test kabhi purane-consumed stock pe depend na kare
  const uniqueSerial = `E2E-${Date.now()}`;
  await request.post('http://localhost:3000/inventory', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      branchId: 'branch-main',
      productId: '23ef298d-835a-40f1-9b8c-4b23a1a6f39c', // Dell XPS 15 (seed data)
      serialNumber: uniqueSerial,
      quantity: 1,
    },
  });
// 2. UI se login karo (ye file khud login-flow test karti hai,
  //    isliye storageState use nahi karti, apna login yahin karti hai)
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill('rkstechware@gmail.com');
  await page.getByPlaceholder('Password').fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/dashboard/);



  // 3. POS pe jao, branch chunein
  await page.goto('/pos');
  const branchSelect = page.locator('select').first();
  await branchSelect.selectOption({ label: 'Main Branch' });

  // 4. Apna banaya hua unique serial search karo — guaranteed milega
  const searchBox = page.getByPlaceholder('Serial scan ya model/SKU search karein…');
  await searchBox.fill(uniqueSerial);
  await expect(
    page.locator('li').filter({ hasText: uniqueSerial }).first()
  ).toBeVisible({ timeout: 10000 });
  await page.locator('li').filter({ hasText: uniqueSerial }).first().click();

  await expect(page.locator('[data-testid^="cart-price-"]')).toHaveCount(1, {
    timeout: 5000,
  });

  // 5. Price bharo
  const priceInput = page.locator('[data-testid^="cart-price-"]').first();
  await priceInput.fill('50000');

  // 6. Total padho (auto-retry se React re-render ka wait ho jaata hai)
  const totalLocator = page.getByTestId('pos-summary-total');
  await expect(totalLocator).not.toHaveText('Rs 0');
  const totalText = await totalLocator.innerText();
  const totalAmount = totalText.replace(/[^\d]/g, '');

  await page.getByPlaceholder('Amount').fill(totalAmount);
  await page.getByTestId('add-payment-button').click();

  await expect(
    page.locator('span.text-green-600', { hasText: 'Rs 0' })
  ).toBeVisible();

  // 7. Complete Sale
  await page.getByTestId('complete-sale-button').click();

  // 8. Receipt dialog khulni chahiye
  await expect(page.getByText('Receipt')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/INV-\d{4}-\d{4}/)).toBeVisible();
});