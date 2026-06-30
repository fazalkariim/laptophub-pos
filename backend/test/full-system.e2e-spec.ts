import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

describe('FULL SYSTEM SMOKE TEST — A to Z', () => {
  let app: INestApplication;
  let http: any;

  let adminToken = '';
  let managerToken = '';
  let salesmanToken = '';

  const created = {
    productIds: [] as string[],
    stockIds: [] as string[],
    customerId: '',
    supplierId: '',
    poId: '',
    saleIds: [] as string[],
    transferId: '',
  };

  const tag = Date.now().toString().slice(-6);

  // Helper: ek naya laptop banaye aur uski stock id return kare
  async function addLaptop(serial: string, cost = 80000): Promise<string> {
    const res = await request(http).post('/inventory')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId: 'branch-main',
        productId: created.productIds[0],
        serialNumber: serial,
        quantity: 1,
        costPrice: cost,
      });
    if (res.status !== 201) {
      throw new Error(`addLaptop failed (${res.status}): ${JSON.stringify(res.body)}`);
    }
    created.stockIds.push(res.body.id);
    return res.body.id;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    http = app.getHttpServer();

    // Logins
    const a = await request(http).post('/auth/login')
      .send({ email: 'admin@laptophub.com', password: 'password123' });
    adminToken = a.body.accessToken;

    const m = await request(http).post('/auth/login')
      .send({ email: 'manager@laptophub.com', password: 'password123' });
    managerToken = m.body.accessToken;

    const s = await request(http).post('/auth/login')
      .send({ email: 'salesman@laptophub.com', password: 'password123' });
    salesmanToken = s.body.accessToken;

    // Ek product banao (saare laptops isi ka)
    const p = await request(http).post('/catalog')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ brand: 'TestDell', model: 'Smoke', category: 'Laptop', sku: `SMOKE-${tag}` });
    created.productIds.push(p.body.id);

    // Ek customer banao
    const c = await request(http).post('/customers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Smoke Customer ${tag}`, contact: `0300${tag}` });
    created.customerId = c.body.customer.id;
  }, 60000);

  afterAll(async () => {
    // Cleanup — sahi order (children pehle, phir parent)
    try {
      for (const id of created.saleIds) {
        await db.payment.deleteMany({ where: { saleId: id } });
        await db.saleLine.deleteMany({ where: { saleId: id } });
      }
      await db.warranty.deleteMany({ where: { customerId: created.customerId } });
      await db.sale.deleteMany({ where: { id: { in: created.saleIds } } });
      if (created.transferId) {
        await db.transferLine.deleteMany({ where: { transferId: created.transferId } });
        await db.transfer.deleteMany({ where: { id: created.transferId } });
      }
      if (created.poId) {
        await db.pOLine.deleteMany({ where: { poId: created.poId } });
        await db.purchaseOrder.deleteMany({ where: { id: created.poId } });
      }
      // Stock movements pehle (wo stock items ko reference karte hain)
      await db.stockMovement.deleteMany({ where: { stockItemId: { in: created.stockIds } } });
      await db.stockItem.deleteMany({ where: { id: { in: created.stockIds } } });
      if (created.customerId) await db.customer.deleteMany({ where: { id: created.customerId } });
      if (created.supplierId) await db.supplier.deleteMany({ where: { id: created.supplierId } });
      // Product delete se pehle: us product se jude SAARE stock items + movements hatao
      await db.stockMovement.deleteMany({ where: { stockItem: { productId: { in: created.productIds } } } });
      await db.stockItem.deleteMany({ where: { productId: { in: created.productIds } } });
      // Product aakhir mein (sab stock hatne ke baad)
      await db.product.deleteMany({ where: { id: { in: created.productIds } } });
    } catch (e) {
      console.log('Cleanup warning (ignore — test results affect nahi hote):', (e as any).message);
    }
    await db.$disconnect();
    await app.close();
  }, 60000);

  // ─── HEALTH ───
  describe('Health (M9)', () => {
    it('GET /health → app + DB zinda', async () => {
      const res = await request(http).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.database).toBe('up');
    });
  });

  // ─── AUTH ───
  describe('Auth (M1)', () => {
    it('Teeno roles ka login hua', () => {
      expect(adminToken).toBeDefined();
      expect(managerToken).toBeDefined();
      expect(salesmanToken).toBeDefined();
    });

    it('Galat password reject (401 ya 400)', async () => {
      const res = await request(http).post('/auth/login')
        .send({ email: 'admin@laptophub.com', password: 'wrongpass' });
      expect([400, 401]).toContain(res.status); // dono soorat mein reject
    });

    it('Bina token protected route → 401', async () => {
      await request(http).get('/branches').expect(401);
    });
  });

  // ─── BRANCHES ───
  describe('Branches (M1)', () => {
    it('Admin branches dekhe (3+)', async () => {
      const res = await request(http).get('/branches')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
    });

    it('Salesman branch nahi bana sakta → 403', async () => {
      await request(http).post('/branches')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({ name: 'X Branch' }).expect(403);
    });
  });

  // ─── CATALOG ───
  describe('Catalog (M1)', () => {
    it('Product ban gaya (beforeAll mein)', () => {
      expect(created.productIds[0]).toBeDefined();
    });

    it('Duplicate SKU → 409', async () => {
      await request(http).post('/catalog')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ brand: 'X', model: 'Y', category: 'Laptop', sku: `SMOKE-${tag}` })
        .expect(409);
    });
  });

  // ─── INVENTORY ───
  describe('Inventory (M2)', () => {
    it('Stock add (laptop)', async () => {
      const id = await addLaptop(`SM-${tag}-1`);
      expect(id).toBeDefined();
    });

    it('Duplicate serial → 409', async () => {
      await request(http).post('/inventory')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ branchId: 'branch-main', productId: created.productIds[0], serialNumber: `SM-${tag}-1`, quantity: 1 })
        .expect(409);
    });

    it('Bulk scan intake (2 serials)', async () => {
      const res = await request(http).post('/inventory/bulk/scan')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ branchId: 'branch-main', productId: created.productIds[0], serials: [`SM-${tag}-2`, `SM-${tag}-3`] })
        .expect(201);
      expect(res.body.imported).toBe(2);
    });

    it('Salesman stock add → 403', async () => {
      await request(http).post('/inventory')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({ branchId: 'branch-main', productId: created.productIds[0], serialNumber: `X-${tag}`, quantity: 1 })
        .expect(403);
    });
  });

  // ─── CUSTOMERS ───
  describe('Customers (M4)', () => {
    it('Customer bana (beforeAll mein)', () => {
      expect(created.customerId).toBeDefined();
    });

    it('Customer search', async () => {
      const res = await request(http).get(`/customers/search?q=Smoke`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── SALES ───
  describe('Sales (M3)', () => {
    it('Cash sale (poora payment) → PAID', async () => {
      const stockId = await addLaptop(`SALE-${tag}-1`);
      const res = await request(http).post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'branch-main',
          lines: [{ stockItemId: stockId, price: 95000 }],
          payments: [{ method: 'cash', amount: 95000 }],
        }).expect(201);
      created.saleIds.push(res.body.id);
      expect(res.body.paymentStatus).toBe('PAID');
      expect(res.body.invoiceNumber).toMatch(/INV-/);
    });

    it('Udhaar sale (customer + partial) → PARTIAL', async () => {
      const stockId = await addLaptop(`SALE-${tag}-2`);
      const res = await request(http).post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'branch-main',
          customerId: created.customerId,
          lines: [{ stockItemId: stockId, price: 100000 }],
          payments: [{ method: 'cash', amount: 30000 }],
        });
      // Agar fail ho to asal error dikhao
      if (res.status !== 201) {
        throw new Error(`Udhaar sale failed (${res.status}): ${JSON.stringify(res.body)}`);
      }
      created.saleIds.push(res.body.id);
      expect(res.body.paymentStatus).toBe('PARTIAL');
    });

    it('Udhaar bina customer → 400', async () => {
      const stockId = await addLaptop(`SALE-${tag}-3`);
      await request(http).post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'branch-main',
          lines: [{ stockItemId: stockId, price: 90000 }],
          payments: [{ method: 'cash', amount: 10000 }],
        }).expect(400);
    });

    it('Customer history → totalDue > 0', async () => {
      const res = await request(http).get(`/sales/customer/${created.customerId}/history`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.summary.totalDue).toBeGreaterThan(0);
    });

    it('Udhaar collect → PAID', async () => {
      const res = await request(http).post('/sales/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ saleId: created.saleIds[1], method: 'cash', amount: 70000 })
        .expect(201);
      expect(res.body.paymentStatus).toBe('PAID');
    });

    it('Receipt data', async () => {
      const res = await request(http).get(`/sales/${created.saleIds[0]}/receipt`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.invoiceNumber).toMatch(/INV-/);
    });

    it('Warranty auto-created (udhaar sale customer ke saath)', async () => {
      const res = await request(http).get(`/sales/customer/${created.customerId}/warranties`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.warranties.length).toBeGreaterThanOrEqual(1);
    });

    it('Return (manager approval) → RETURNED', async () => {
      const stockId = await addLaptop(`SALE-${tag}-4`);
      const sale = await request(http).post('/sales')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          branchId: 'branch-main',
          lines: [{ stockItemId: stockId, price: 90000 }],
          payments: [{ method: 'cash', amount: 90000 }],
        }).expect(201);
      created.saleIds.push(sale.body.id);

      const res = await request(http).post('/sales/returns')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ saleId: sale.body.id, stockItemIds: [stockId], reason: 'Smoke return' })
        .expect(201);
      expect(res.body.status).toBe('RETURNED');
    });

    it('Salesman return → 403', async () => {
      await request(http).post('/sales/returns')
        .set('Authorization', `Bearer ${salesmanToken}`)
        .send({ saleId: created.saleIds[0], stockItemIds: [created.stockIds[0]], reason: 'x' })
        .expect(403);
    });
  });

  // ─── PURCHASING ───
  describe('Purchasing (M6)', () => {
    it('Supplier bana', async () => {
      const res = await request(http).post('/suppliers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: `Smoke Supplier ${tag}`, contact: '042-111', terms: '30 days' })
        .expect(201);
      created.supplierId = res.body.id;
    });

    it('PO bana (DRAFT)', async () => {
      const res = await request(http).post('/purchase-orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: created.supplierId,
          destinationBranchId: 'branch-main',
          lines: [{ productId: created.productIds[0], quantity: 3, costPrice: 78000 }],
        }).expect(201);
      created.poId = res.body.id;
      expect(res.body.status).toBe('DRAFT');
    });

    it('PO SENT', async () => {
      const res = await request(http).post(`/purchase-orders/${created.poId}/send`)
        .set('Authorization', `Bearer ${adminToken}`).expect(201);
      expect(res.body.status).toBe('SENT');
    });

    it('Goods receipt → RECEIVED', async () => {
      const po = await request(http).get(`/purchase-orders/${created.poId}`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      const poLineId = po.body.lines[0].id;

      const res = await request(http).post('/purchase-orders/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          poId: created.poId,
          lines: [{ poLineId, serials: [`GR-${tag}-1`, `GR-${tag}-2`, `GR-${tag}-3`] }],
        }).expect(201);
      expect(res.body.status).toBe('RECEIVED');

      const stock = await db.stockItem.findMany({
        where: { serialNumber: { in: [`GR-${tag}-1`, `GR-${tag}-2`, `GR-${tag}-3`] } },
        select: { id: true },
      });
      created.stockIds.push(...stock.map((s) => s.id));
    });

    it('Supplier payment → PAID', async () => {
      const res = await request(http).post('/purchase-orders/pay-supplier')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ poId: created.poId, method: 'bank transfer', amount: 234000 })
        .expect(201);
      expect(res.body.paymentStatus).toBe('PAID');
    });

    it('Supplier payables', async () => {
      await request(http).get(`/purchase-orders/supplier/${created.supplierId}/payables`)
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });
  });

  // ─── TRANSFERS ───
  describe('Transfers (M5)', () => {
    it('Transfer bhejo → IN_TRANSIT', async () => {
      const transferStockId = created.stockIds[created.stockIds.length - 1];
      const res = await request(http).post('/transfers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sourceBranchId: 'branch-main',
          destBranchId: 'branch-two',
          stockItemIds: [transferStockId],
        }).expect(201);
      created.transferId = res.body.id;
      expect(res.body.status).toBe('IN_TRANSIT');
    });

    it('Transfer receive → RECEIVED', async () => {
      const res = await request(http).post('/transfers/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ transferId: created.transferId }).expect(201);
      expect(res.body.status).toBe('RECEIVED');
    });

    it('Consolidated stock view', async () => {
      await request(http).get('/transfers/consolidated-stock')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });
  });

  // ─── FINANCE ───
  describe('Finance (M7)', () => {
    it('Expense add', async () => {
      await request(http).post('/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ branchId: 'branch-main', category: 'SmokeTest', amount: 5000 })
        .expect(201);
    });

    it('Sales summary', async () => {
      await request(http).get('/finance/sales-summary/branch-main')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });

    it('Profit report', async () => {
      const res = await request(http).get('/finance/profit/branch-main')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.grossMargin).toBeDefined();
    });

    it('Dashboard (Super Admin)', async () => {
      const res = await request(http).get('/finance/dashboard')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(res.body.overall).toBeDefined();
    });

    it('Salesman finance → 403', async () => {
      await request(http).get('/finance/dashboard')
        .set('Authorization', `Bearer ${salesmanToken}`).expect(403);
    });
  });

  // ─── REPORTS ───
  describe('Reports (M8)', () => {
    it('Salesman performance', async () => {
      await request(http).get('/reports/salesman-performance')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });

    it('Best-selling products', async () => {
      await request(http).get('/reports/best-selling-products')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });

    it('Stock valuation', async () => {
      await request(http).get('/reports/stock-valuation')
        .set('Authorization', `Bearer ${adminToken}`).expect(200);
    });

    it('Salesman stock valuation → 403 (cost protection)', async () => {
      await request(http).get('/reports/stock-valuation')
        .set('Authorization', `Bearer ${salesmanToken}`).expect(403);
    });
  });
});