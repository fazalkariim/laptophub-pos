import { test, expect } from '@playwright/test';
import { getAdminToken } from './utils/get-token';
test('POS: offline sale queues and auto-syncs when back online', async ({
  page,
  context,
  request,
}) => {
  const accessToken = getAdminToken();

  const uniqueSerial = `E2E-OFFLINE-${Date.now()}`;
  await request.post('http://localhost:3000/inventory', {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      branchId: 'branch-main',
      productId: '23ef298d-835a-40f1-9b8c-4b23a1a6f39c',
      serialNumber: uniqueSerial,
      quantity: 1,
    },
  });


  // 2. POS pe jao, branch chunein
  await page.goto('/pos');
  const branchSelect = page.locator('select').first();
  await branchSelect.selectOption({ label: 'Main Branch' });

  // 3. Apna banaya hua unique serial search karo
  const searchBox = page.getByPlaceholder('Serial scan ya model/SKU search karein…');
  await searchBox.fill(uniqueSerial);
  await expect(
    page.locator('li').filter({ hasText: uniqueSerial }).first()
  ).toBeVisible({ timeout: 10000 });
  await page.locator('li').filter({ hasText: uniqueSerial }).first().click();

  await expect(page.locator('[data-testid^="cart-price-"]')).toHaveCount(1, {
    timeout: 5000,
  });

  // 4. Price bharo
  const priceInput = page.locator('[data-testid^="cart-price-"]').first();
  await priceInput.fill('40000');

  // 5. Total padho, poora payment daalo
  const totalLocator = page.getByTestId('pos-summary-total');
  await expect(totalLocator).not.toHaveText('Rs 0');
  const totalText = await totalLocator.innerText();
  const totalAmount = totalText.replace(/[^\d]/g, '');
  await page.getByPlaceholder('Amount').fill(totalAmount);
  await page.getByTestId('add-payment-button').click();

  // 6. Ab offline karo
  await context.setOffline(true);

  // 7. Complete Sale dabao
  await page.getByTestId('complete-sale-button').click();

  // 8. Sale queue mein jaani chahiye
  const pendingBadge = page.getByText(/Sale.*Pending/i);
  await expect(pendingBadge).toBeVisible({ timeout: 15000 });

  // 9. Online karo — auto-sync hona chahiye
  await context.setOffline(false);

  // 10. Badge gayab ho jaani chahiye
  await expect(pendingBadge).not.toBeVisible({ timeout: 15000 });
});