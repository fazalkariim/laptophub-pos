import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { BulkIntakeService } from './bulk-intake.service';
import { BulkScanDto } from './dto/bulk-scan.dto';
import { BulkImportService } from './bulk-import.service';

// User ki shape jo controller se aayegi
interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly bulkIntakeService: BulkIntakeService,
    private readonly bulkImportService: BulkImportService,
  ) {}

  // Ek branch ka stock dekho
  findByBranch(branchId: string) {
    return this.tenantPrisma.client.stockItem.findMany({
      where: { branchId },
      include: {
        product: { select: { brand: true, model: true, sku: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Stock add karo — stockItem + audit ek transaction mein
  async addStock(dto: CreateStockDto, user: CurrentUser) {
    // 1. Product maujood hai? (isi tenant ka)
    const product = await this.tenantPrisma.client.product.findFirst({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product catalog mein nahi mila');
    }

    // 2. Branch maujood hai?
    const branch = await this.tenantPrisma.client.branch.findFirst({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException('Branch nahi mila');
    }

    // 3. Agar serial diya hai, to wo pehle se to nahi? (duplicate serial mana hai)
    if (dto.serialNumber) {
      const existingSerial = await this.tenantPrisma.client.stockItem.findFirst({
        where: { serialNumber: dto.serialNumber },
      });
      if (existingSerial) {
        throw new ConflictException('Ye serial number pehle se stock mein hai');
      }
      // Serial wale items ki quantity hamesha 1 honi chahiye
      if (dto.quantity !== 1) {
        throw new BadRequestException('Serial wale item ki quantity 1 honi chahiye');
      }
    }

    // 4. TRANSACTION: stockItem banao + audit row banao — dono ek saath
    const result = await this.tenantPrisma.client.$transaction(async (tx) => {
      // (a) stock item banao
      const stockItem = await tx.stockItem.create({
        data: {
          branchId: dto.branchId,
          productId: dto.productId,
          serialNumber: dto.serialNumber ?? null,
          quantity: dto.quantity,
          costPrice: dto.costPrice ?? null,
          status: 'IN_STOCK',
        } as any,
      });

      // (b) audit row banao — kis ne, kahan, kyun
      await tx.stockMovement.create({
        data: {
          branchId: dto.branchId,
          userId: user.userId,
          type: 'INTAKE',
          reason: 'Manual stock intake',
          stockItemId: stockItem.id,
        } as any,
      });

      return stockItem;
    });

    return result;
  }
   // Batch scan — serials ka array intake karo
  async bulkScan(dto: BulkScanDto, user: CurrentUser) {
    // Serials ko intake units mein badlo
    const units = dto.serials.map((serial, index) => ({
      serialNumber: serial.trim(),
      rowIndex: index + 1,
    }));

    return this.bulkIntakeService.bulkIntake(
      dto.branchId,
      dto.productId,
      units,
      user,
    );
  }
  
  // Stock adjust karo — quantity change + audit, ek transaction mein
  async adjust(dto: AdjustStockDto, user: CurrentUser) {
    // 1. Stock item maujood hai? (isi tenant ka)
    const item = await this.tenantPrisma.client.stockItem.findFirst({
      where: { id: dto.stockItemId },
    });
    if (!item) {
      throw new NotFoundException('Stock item nahi mila');
    }

    // 2. Branch check (BranchScopeGuard body ke branchId ko dekhta hai,
    //    lekin yahan branchId item se aata hai — to manually bhi check karte hain)
    if (user.role !== 'SUPER_ADMIN' && item.branchId !== user.branchId) {
      throw new BadRequestException('Aap sirf apni branch ka stock adjust kar sakte hain');
    }

    // 3. Nayi quantity nikaalo
    const newQuantity = item.quantity + dto.quantityChange;
    if (newQuantity < 0) {
      throw new BadRequestException('Quantity 0 se kam nahi ho sakti');
    }

    // 4. TRANSACTION: stock update + audit row
    const result = await this.tenantPrisma.client.$transaction(async (tx) => {
      const updated = await tx.stockItem.update({
        where: { id: dto.stockItemId },
        data: {
          quantity: newQuantity,
          ...(dto.newStatus ? { status: dto.newStatus } : {}),
        } as any,
      });

      await tx.stockMovement.create({
        data: {
          branchId: item.branchId,
          userId: user.userId,
          type: 'ADJUSTMENT',
          reason: dto.reason,
          stockItemId: item.id,
        } as any,
      });

      return updated;
    });

    return result;
  }

  // Low-stock items — ek branch mein jo stock threshold se neeche hai
  async lowStock(branchId: string, threshold: number = 5) {
    // Har product ka total quantity nikaalo us branch mein
    const items = await this.tenantPrisma.client.stockItem.groupBy({
      by: ['productId'],
      where: {
        branchId,
        status: 'IN_STOCK',
      },
      _sum: { quantity: true },
    });

    // Sirf wo jinka total threshold se kam hai
    const lowItems = items.filter(
      (i) => (i._sum.quantity ?? 0) <= threshold,
    );

    // Product details bhi laao taake naam dikhe
    const productIds = lowItems.map((i) => i.productId);
    const products = await this.tenantPrisma.client.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, brand: true, model: true, sku: true },
    });

    // Jodo: product info + current quantity
    return lowItems.map((i) => {
      const product = products.find((p) => p.id === i.productId);
      return {
        product,
        currentQuantity: i._sum.quantity ?? 0,
        threshold,
      };
    });
  }

// File import — CSV/Excel se bulk intake
  async bulkImport(
    branchId: string,
    productId: string,
    fileBuffer: Buffer,
    user: CurrentUser,
  ) {
    // 1. File parse karo — valid + parse-stage rejected dono milenge
    const { validRows, rejectedRows } = this.bulkImportService.parseFile(fileBuffer);

    // 2. Valid rows ko shared core se intake karo
    const units = validRows.map((row) => ({
      serialNumber: row.serialNumber,
      costPrice: row.costPrice,
      rowIndex: row.rowIndex,
    }));

    const result = await this.bulkIntakeService.bulkIntake(
      branchId,
      productId,
      units,
      user,
    );

    // 3. Parse-stage rejected rows ko bhi final result mein jodo
    return {
      imported: result.imported,
      failedCount: result.failedCount + rejectedRows.length,
      failed: [...rejectedRows, ...result.failed],
    };
  }
  
}