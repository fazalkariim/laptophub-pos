import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

// Ek intake item — serial (laptop) ya sirf product+qty
interface IntakeUnit {
  serialNumber: string;
  costPrice?: number;
  rowIndex: number; // error reporting ke liye
}

@Injectable()
export class BulkIntakeService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // Dono methods (scan + file) yahan aate hain.
  // Per-row validation + idempotency + ek audited transaction.
  async bulkIntake(
    branchId: string,
    productId: string,
    units: IntakeUnit[],
    user: CurrentUser,
  ) {
    // 1. Branch maujood hai?
    const branch = await this.tenantPrisma.client.branch.findFirst({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException('Branch nahi mila');
    }

    // 2. Branch scope: Manager sirf apni branch
    if (user.role !== 'SUPER_ADMIN' && branchId !== user.branchId) {
      throw new NotFoundException('Aap sirf apni branch mein intake kar sakte hain');
    }

    // 3. Product maujood hai catalog mein? (unrecognised = reject, auto-create nahi)
    const product = await this.tenantPrisma.client.product.findFirst({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product catalog mein nahi mila');
    }

    // 4. Jo serials request mein hain, un mein se kaunse pehle se stock mein hain?
    //    (idempotency — duplicate upload se double stock na bane)
    const incomingSerials = units.map((u) => u.serialNumber);
    const existing = await this.tenantPrisma.client.stockItem.findMany({
      where: { serialNumber: { in: incomingSerials } },
      select: { serialNumber: true },
    });
    const existingSet = new Set(existing.map((e) => e.serialNumber));

    // 5. Request ke andar bhi duplicate ho sakte hain — unhe bhi pakdo
    const seenInThisBatch = new Set<string>();

    const validUnits: IntakeUnit[] = [];
    const failed: { row: number; serial: string; reason: string }[] = [];

    for (const unit of units) {
      if (existingSet.has(unit.serialNumber)) {
        failed.push({
          row: unit.rowIndex,
          serial: unit.serialNumber,
          reason: 'Serial pehle se stock mein hai',
        });
      } else if (seenInThisBatch.has(unit.serialNumber)) {
        failed.push({
          row: unit.rowIndex,
          serial: unit.serialNumber,
          reason: 'Is batch mein serial do baar aaya',
        });
      } else {
        seenInThisBatch.add(unit.serialNumber);
        validUnits.push(unit);
      }
    }

    // 6. Valid units ko ek transaction mein commit karo + har ek ka audit
    if (validUnits.length > 0) {
      await this.tenantPrisma.client.$transaction(async (tx) => {
        for (const unit of validUnits) {
          const stockItem = await tx.stockItem.create({
            data: {
              branchId,
              productId,
              serialNumber: unit.serialNumber,
              quantity: 1,
              costPrice: unit.costPrice ?? null,
              status: 'IN_STOCK',
            } as any,
          });

          await tx.stockMovement.create({
            data: {
              branchId,
              userId: user.userId,
              type: 'BULK_INTAKE',
              reason: 'BULK_INTAKE',
              stockItemId: stockItem.id,
            } as any,
          });
        }
      });
    }

    // 7. Per-row result wapas karo
    return {
      imported: validUnits.length,
      failedCount: failed.length,
      failed,
    };
  }
}