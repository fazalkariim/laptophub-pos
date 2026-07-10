import { test, expect } from '@playwright/test';
import { getAdminToken } from './utils/get-token';
test('Purchasing: create PO, send, receive goods, stock appears', async ({
  page,
  request,
}) => {
  // 0. Login karke token lo
  const accessToken = getAdminToken();
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // 1. Ek supplier chahiye — mojooda list se pehla utha lo
  const suppliersRes = await request.get('http://localhost:3000/suppliers', {
    headers: authHeaders,
  });
  const suppliers = await suppliersRes.json();
  const supplierId = suppliers[0].id;

  // 2. PO banao API se (chhoti quantity taake receive test aasaan ho)
  const poRes = await request.post('http://localhost:3000/purchase-orders', {
    headers: authHeaders,
    data: {
      supplierId,
      destinationBranchId: 'branch-main',
      lines: [
        {
          productId: '23ef298d-835a-40f1-9b8c-4b23a1a6f39c',
          quantity: 1,
          costPrice: 70000,
        },
      ],
      note: 'E2E test PO',
    },
  });
  const po = await poRes.json();

  // 3. UI se login


  // 4. Purchase Orders list pe jao, apna PO dhoondo
  await page.goto('/purchasing/orders');
  const row = page.locator('tr').filter({ hasText: po.poNumber });
  await expect(row).toBeVisible({ timeout: 10000 });

  // 5. Send karo
  await row.getByRole('button', { name: 'Send' }).click();
  await expect(row.getByText('SENT')).toBeVisible({ timeout: 10000 });

  // 6. Detail page pe jao (View)
  await row.getByRole('button', { name: 'View' }).click();
  await expect(page).toHaveURL(new RegExp(`/purchasing/orders/${po.id}`));

  // 7. Receive Goods dialog kholo
  await page.getByRole('button', { name: 'Receive Goods' }).click();

  // 8. Unique serial daalo aur add karo
  const uniqueSerial = `E2E-PO-${Date.now()}`;
  await page
    .getByPlaceholder('Serial scan/type karein…')
    .fill(uniqueSerial);
  await page.getByRole('button', { name: 'Add' }).click();

  // Confirm karne se pehle wait karo ke serial list mein dikhe
  // (React state update ka race condition avoid karne ke liye)
  await expect(page.getByText(uniqueSerial)).toBeVisible({ timeout: 5000 });

  // 9. Confirm karo
  await page.getByRole('button', { name: /Receive Confirm/i }).click();

  // Dialog band hone ka wait karo (submit process complete hone ka sign)
  await expect(page.getByText('Goods Receive Karein')).not.toBeVisible({
    timeout: 10000,
  });

  // 10. PO status ab RECEIVED hona chahiye — exact case-sensitive match
  //     taake "Ordered: 1 · Received: 0" jaisa text galti se match na ho
  await expect(page.getByText(/^RECEIVED$/)).toBeVisible({ timeout: 10000 });

  // 11. Stock mein naya item verify karo (API se seedha check, tez aur pakka)
  const stockRes = await request.get(
    `http://localhost:3000/inventory/branch/branch-main`,
    { headers: authHeaders }
  );
  const stock = await stockRes.json();
  const newItem = stock.find((s: any) => s.serialNumber === uniqueSerial);
  expect(newItem).toBeTruthy();
  expect(newItem.status).toBe('IN_STOCK');
});