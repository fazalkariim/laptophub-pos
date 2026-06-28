import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';


// Wo models jinke paas tenantId column NAHI hai — scoping inpe nahi lagani
const TENANT_EXEMPT_MODELS = ['Tenant', 'SaleLine', 'Payment', 'POLine', 'TransferLine'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  // Ye method ek "tenant-scoped" client banata hai.
  // getTenantId ek function hai jo har query ke waqt abhi ka tenantId laata hai.
  forTenant(getTenantId: () => string | null) {
    return this.$extends({
      name: 'tenant-scoping',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = getTenantId();

            // Tenant table ko skip karo, aur agar tenantId hi nahi to chhod do
            if (!tenantId || TENANT_EXEMPT_MODELS.includes(model)) {
              return query(args);
            }

            // READ aur write operations mein tenantId filter daalo
            const readOps = [
              'findMany', 'findFirst', 'findFirstOrThrow',
              'findUnique', 'findUniqueOrThrow', 'count',
              'aggregate', 'groupBy', 'updateMany', 'deleteMany',
            ];

            if (readOps.includes(operation)) {
              (args as any).where = {
                ...(args as any).where,
                tenantId,
              };
            }

            // CREATE operations mein tenantId apne aap data mein daalo
            if (operation === 'create') {
              (args as any).data = {
                ...(args as any).data,
                tenantId,
              };
            }

            if (operation === 'createMany') {
              const data = (args as any).data;
              if (Array.isArray(data)) {
                (args as any).data = data.map((d: any) => ({ ...d, tenantId }));
              }
            }

            return query(args);
          },
        },
      },
    });
  }
}