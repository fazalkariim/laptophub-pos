import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding shuru...');

  // ─── 1. Tenant (LaptopHub — tenant #1) ───
  const tenant = await prisma.tenant.upsert({
    where: { id: 'laptophub-tenant-001' },
    update: {},
    create: {
      id: 'laptophub-tenant-001',
      name: 'LaptopHub',
      plan: 'single',
      status: 'active',
    },
  });
  console.log(`✅ Tenant banaya: ${tenant.name} (${tenant.id})`);

  // ─── 2. Branches (3 branches) ───
  const branchData = [
    { id: 'branch-main', name: 'Main Branch', address: 'Head Office' },
    { id: 'branch-two', name: 'Branch 2', address: 'City Center' },
    { id: 'branch-three', name: 'Branch 3', address: 'Mall Road' },
  ];

  for (const b of branchData) {
    await prisma.branch.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        tenantId: tenant.id,
        name: b.name,
        address: b.address,
      },
    });
    console.log(`✅ Branch banaya: ${b.name}`);
  }

  // ─── 3. Users (Super Admin + ek Branch Manager + ek Salesman) ───
  const passwordHash = await bcrypt.hash('password123', 10);

  // Super Admin — branchId null (head office, sab branches dekh sakta hai)
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@laptophub.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: null,
      role: 'SUPER_ADMIN',
      email: 'admin@laptophub.com',
      passwordHash,
      name: 'Super Admin',
    },
  });
  console.log('✅ Super Admin banaya: admin@laptophub.com');

  // Branch Manager — Main Branch ka
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'manager@laptophub.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: 'branch-main',
      role: 'BRANCH_MANAGER',
      email: 'manager@laptophub.com',
      passwordHash,
      name: 'Main Branch Manager',
    },
  });
  console.log('✅ Branch Manager banaya: manager@laptophub.com');

  // Salesman — Main Branch ka
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'salesman@laptophub.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      branchId: 'branch-main',
      role: 'SALESMAN',
      email: 'salesman@laptophub.com',
      passwordHash,
      name: 'Main Branch Salesman',
    },
  });
  console.log('✅ Salesman banaya: salesman@laptophub.com');

  console.log('🎉 Seeding mukammal!');
  console.log('\nLogin credentials (sab ka password: password123):');
  console.log('  Super Admin    → admin@laptophub.com');
  console.log('  Branch Manager → manager@laptophub.com');
  console.log('  Salesman       → salesman@laptophub.com');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });