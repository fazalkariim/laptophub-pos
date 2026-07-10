import { test, expect } from '@playwright/test';
import { getAdminToken } from './utils/get-token';
test('Transfers: create via API, receive via UI', async ({ page, request }) => {
  // 0. Login karke token lo
const accessToken = getAdminToken();
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 1. Ek fresh stock item banao Main Branch mein (transfer ke liye)
  const uniqueSerial = `E2E-TRF-${Date.now()}`;
  const stockRes = await request.post('http://localhost:3000/inventory', {
    headers: authHeaders,
    data: {
      branchId: 'branch-main',
      productId: '23ef298d-835a-40f1-9b8c-4b23a1a6f39c',
      serialNumber: uniqueSerial,
      quantity: 1,
    },
  });
  const stockItem = await stockRes.json();

  // 2. Transfer banao Main Branch -> Branch 2, isi item ke saath
  const transferRes = await request.post('http://localhost:3000/transfers', {
    headers: authHeaders,
    data: {
      sourceBranchId: 'branch-main',
      destBranchId: 'branch-two',
      stockItemIds: [stockItem.id],
      note: 'E2E test transfer',
    },
  });
  const transfer = await transferRes.json();

  // 3. UI se login karo


  // 4. Transfers page pe jao
  await page.goto('/transfers');

  // 5. Apna transfer table mein dhoondo (transferNumber se)
  const row = page.locator('tr').filter({ hasText: transfer.transferNumber });
  await expect(row).toBeVisible({ timeout: 10000 });
  await expect(row.getByText('IN TRANSIT')).toBeVisible();

  // 6. Receive button dabao
  await row.getByRole('button', { name: 'Receive' }).click();

  // 7. Reason dialog aayega — reason bhar ke confirm karo
  await page.getByPlaceholder('jaise: Damage ho gaya tha').fill('E2E receive test');
  await page.getByRole('button', { name: /Receive Confirm/i }).click();

  // 8. Status ab RECEIVED ho jaana chahiye
  await expect(row.getByText('RECEIVED')).toBeVisible({ timeout: 10000 });
});