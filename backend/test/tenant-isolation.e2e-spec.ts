import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// Direct DB access — test data banane aur saaf karne ke liye (scoping ke bina)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

describe('Tenant Isolation (e2e) — most important safety net', () => {
  let app: INestApplication;

  // Do tenants ka data
  const A = {
    tenantId: 'test-tenant-A',
    branchId: 'test-branch-A',
    userId: '',
    email: 'admin-a@test.com',
    token: '',
    productId: '',
  };
  const B = {
    tenantId: 'test-tenant-B',
    branchId: 'test-branch-B',
    userId: '',
    email: 'admin-b@test.com',
    token: '',
    productId: '',
  };

  beforeAll(async () => {
    // App start
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    const passwordHash = await bcrypt.hash('password123', 10);

    // ─── Tenant A setup (direct DB, scoping ke bina) ───
    await db.tenant.upsert({
      where: { id: A.tenantId },
      update: {},
      create: { id: A.tenantId, name: 'Tenant A', plan: 'single', status: 'active' },
    });
    await db.branch.upsert({
      where: { id: A.branchId },
      update: {},
      create: { id: A.branchId, tenantId: A.tenantId, name: 'A Branch' },
    });
    const userA = await db.user.upsert({
      where: { tenantId_email: { tenantId: A.tenantId, email: A.email } },
      update: {},
      create: {
        tenantId: A.tenantId, branchId: A.branchId, role: 'SUPER_ADMIN',
        email: A.email, passwordHash, name: 'Admin A',
      },
    });
    A.userId = userA.id;
    const productA = await db.product.create({
      data: { tenantId: A.tenantId, brand: 'TenantA-Dell', model: 'Secret-A', category: 'Laptop', sku: 'SKU-A-SECRET' },
    });
    A.productId = productA.id;

    // ─── Tenant B setup ───
    await db.tenant.upsert({
      where: { id: B.tenantId },
      update: {},
      create: { id: B.tenantId, name: 'Tenant B', plan: 'single', status: 'active' },
    });
    await db.branch.upsert({
      where: { id: B.branchId },
      update: {},
      create: { id: B.branchId, tenantId: B.tenantId, name: 'B Branch' },
    });
    const userB = await db.user.upsert({
      where: { tenantId_email: { tenantId: B.tenantId, email: B.email } },
      update: {},
      create: {
        tenantId: B.tenantId, branchId: B.branchId, role: 'SUPER_ADMIN',
        email: B.email, passwordHash, name: 'Admin B',
      },
    });
    B.userId = userB.id;
    const productB = await db.product.create({
      data: { tenantId: B.tenantId, brand: 'TenantB-HP', model: 'Secret-B', category: 'Laptop', sku: 'SKU-B-SECRET' },
    });
    B.productId = productB.id;

    // ─── Dono ka login token lo ───
    const loginA = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: A.email, password: 'password123' });
    A.token = loginA.body.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: B.email, password: 'password123' });
    B.token = loginB.body.accessToken;
  });

  afterAll(async () => {
    // Test data saaf karo (order matters — children pehle)
    await db.product.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } });
    await db.user.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } });
    await db.branch.deleteMany({ where: { tenantId: { in: [A.tenantId, B.tenantId] } } });
    await db.tenant.deleteMany({ where: { id: { in: [A.tenantId, B.tenantId] } } });
    await db.$disconnect();
    await app.close();
  });

  // ─── Tests ───

  it('dono ka login successful hona chahiye', () => {
    expect(A.token).toBeDefined();
    expect(B.token).toBeDefined();
  });

  it('Tenant A apne catalog mein sirf apna product dekhe (B ka nahi)', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog')
      .set('Authorization', `Bearer ${A.token}`)
      .expect(200);

    const skus = res.body.data.map((p: any) => p.sku);
    expect(skus).toContain('SKU-A-SECRET');       // apna dikhe
    expect(skus).not.toContain('SKU-B-SECRET');   // B ka NAHI dikhe
  });

  it('Tenant B apne catalog mein sirf apna product dekhe (A ka nahi)', async () => {
    const res = await request(app.getHttpServer())
      .get('/catalog')
      .set('Authorization', `Bearer ${B.token}`)
      .expect(200);

    const skus = res.body.data.map((p: any) => p.sku);
    expect(skus).toContain('SKU-B-SECRET');
    expect(skus).not.toContain('SKU-A-SECRET');
  });

  it('Tenant A seedha B ke product ki id maange to NAHI mile (404)', async () => {
    // A apni token se B ka product id access karne ki koshish kare
    await request(app.getHttpServer())
      .get(`/catalog/${B.productId}`)
      .set('Authorization', `Bearer ${A.token}`)
      .expect(404); // scoping ki wajah se "nahi mila"
  });

  it('Tenant A, B ke branch ka stock NAHI dekh sakta', async () => {
    // A apni token se B ki branch ka stock maange
    const res = await request(app.getHttpServer())
      .get(`/inventory/branch/${B.branchId}`)
      .set('Authorization', `Bearer ${A.token}`);

    // Ya to 403 (branch scope) ya khaali (scoping) — dono soorat mein B ka data nahi
    if (res.status === 200) {
      expect(res.body.length).toBe(0); // khaali, B ka stock nahi
    } else {
      expect([403, 404]).toContain(res.status);
    }
  });
});