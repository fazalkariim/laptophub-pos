import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferActionDto } from './dto/transfer-action.dto';

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class TransfersService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ─── SEND: stock bhejo (IN_TRANSIT) ───
  async createTransfer(dto: CreateTransferDto, user: CurrentUser) {
    // Source aur dest alag hon
    if (dto.sourceBranchId === dto.destBranchId) {
      throw new BadRequestException('Source aur destination branch alag hone chahiye');
    }

    // Branch scope: Manager sirf apni branch se bhej sakta hai
    if (user.role !== 'SUPER_ADMIN' && dto.sourceBranchId !== user.branchId) {
      throw new BadRequestException('Aap sirf apni branch se transfer bhej sakte hain');
    }

    // Dono branches maujood hain?
    const branches = await this.tenantPrisma.client.branch.findMany({
      where: { id: { in: [dto.sourceBranchId, dto.destBranchId] } },
    });
    if (branches.length !== 2) {
      throw new NotFoundException('Source ya destination branch nahi mila');
    }

    // Items laao aur validate karo
    const items = await this.tenantPrisma.client.stockItem.findMany({
      where: { id: { in: dto.stockItemIds } },
    });
    for (const itemId of dto.stockItemIds) {
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        throw new NotFoundException(`Stock item ${itemId} nahi mila`);
      }
      if (item.branchId !== dto.sourceBranchId) {
        throw new BadRequestException(`Item ${item.serialNumber ?? itemId} source branch ka nahi hai`);
      }
      if (item.status !== 'IN_STOCK') {
        throw new BadRequestException(`Item ${item.serialNumber ?? itemId} available nahi (status: ${item.status})`);
      }
    }

    // TRANSACTION: transfer banao + items IN_TRANSIT + audit
    return this.tenantPrisma.client.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const counter = await tx.counter.upsert({
        where: { tenantId_name: { tenantId: user.tenantId, name: 'transfer' } } as any,
        update: { value: { increment: 1 } },
        create: { tenantId: user.tenantId, name: 'transfer', value: 1 } as any,
      });
      const transferNumber = `TRF-${year}-${String(counter.value).padStart(4, '0')}`;

      const transfer = await tx.transfer.create({
        data: {
          transferNumber,
          sourceBranchId: dto.sourceBranchId,
          destBranchId: dto.destBranchId,
          status: 'IN_TRANSIT',
          sentById: user.userId,
          note: dto.note ?? null,
        } as any,
      });

      for (const itemId of dto.stockItemIds) {
        await tx.transferLine.create({
          data: { transferId: transfer.id, stockItemId: itemId } as any,
        });
        // Item IN_TRANSIT — source branch ke stock se "gaya hua"
        await tx.stockItem.update({
          where: { id: itemId },
          data: { status: 'IN_TRANSIT' } as any,
        });
        await tx.stockMovement.create({
          data: {
            branchId: dto.sourceBranchId,
            userId: user.userId,
            type: 'TRANSFER_OUT',
            reason: `Transfer ${transferNumber} to ${dto.destBranchId}`,
            stockItemId: itemId,
          } as any,
        });
      }

      return this.findOneInTx(tx, transfer.id);
    });
  }

  // ─── RECEIVE: dest branch confirm kare ───
  async receiveTransfer(dto: TransferActionDto, user: CurrentUser) {
    const transfer = await this.getTransferOrThrow(dto.transferId);

    // Sirf dest branch receive kar sakti hai
    if (user.role !== 'SUPER_ADMIN' && transfer.destBranchId !== user.branchId) {
      throw new BadRequestException('Sirf destination branch hi receive kar sakti hai');
    }
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`Ye transfer ${transfer.status} hai, receive nahi ho sakta`);
    }

    return this.tenantPrisma.client.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        // Item ab dest branch mein IN_STOCK
        await tx.stockItem.update({
          where: { id: line.stockItemId },
          data: { branchId: transfer.destBranchId, status: 'IN_STOCK' } as any,
        });
        await tx.stockMovement.create({
          data: {
            branchId: transfer.destBranchId,
            userId: user.userId,
            type: 'TRANSFER_IN',
            reason: `Received transfer ${transfer.transferNumber}`,
            stockItemId: line.stockItemId,
          } as any,
        });
      }
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: 'RECEIVED', receivedById: user.userId, completedAt: new Date() } as any,
      });
      return this.findOneInTx(tx, transfer.id);
    });
  }

  // ─── REJECT: dest branch maal wapas kare ───
  async rejectTransfer(dto: TransferActionDto, user: CurrentUser) {
    const transfer = await this.getTransferOrThrow(dto.transferId);

    if (user.role !== 'SUPER_ADMIN' && transfer.destBranchId !== user.branchId) {
      throw new BadRequestException('Sirf destination branch hi reject kar sakti hai');
    }
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`Ye transfer ${transfer.status} hai, reject nahi ho sakta`);
    }

    return this.tenantPrisma.client.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        // Item wapas source branch mein IN_STOCK
        await tx.stockItem.update({
          where: { id: line.stockItemId },
          data: { branchId: transfer.sourceBranchId, status: 'IN_STOCK' } as any,
        });
        await tx.stockMovement.create({
          data: {
            branchId: transfer.sourceBranchId,
            userId: user.userId,
            type: 'TRANSFER_IN',
            reason: `Rejected transfer ${transfer.transferNumber}: ${dto.reason ?? 'no reason'}`,
            stockItemId: line.stockItemId,
          } as any,
        });
      }
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: 'REJECTED', receivedById: user.userId, completedAt: new Date() } as any,
      });
      return this.findOneInTx(tx, transfer.id);
    });
  }

  // ─── CANCEL: source branch transit se pehle wapas le ───
  async cancelTransfer(dto: TransferActionDto, user: CurrentUser) {
    const transfer = await this.getTransferOrThrow(dto.transferId);

    // Sirf source branch cancel kar sakti hai
    if (user.role !== 'SUPER_ADMIN' && transfer.sourceBranchId !== user.branchId) {
      throw new BadRequestException('Sirf source branch hi cancel kar sakti hai');
    }
    if (transfer.status !== 'IN_TRANSIT') {
      throw new BadRequestException(`Ye transfer ${transfer.status} hai, cancel nahi ho sakta`);
    }

    return this.tenantPrisma.client.$transaction(async (tx) => {
      for (const line of transfer.lines) {
        await tx.stockItem.update({
          where: { id: line.stockItemId },
          data: { status: 'IN_STOCK' } as any, // source mein hi hai, bas wapas IN_STOCK
        });
        await tx.stockMovement.create({
          data: {
            branchId: transfer.sourceBranchId,
            userId: user.userId,
            type: 'TRANSFER_IN',
            reason: `Cancelled transfer ${transfer.transferNumber}`,
            stockItemId: line.stockItemId,
          } as any,
        });
      }
      await tx.transfer.update({
        where: { id: transfer.id },
        data: { status: 'CANCELLED', completedAt: new Date() } as any,
      });
      return this.findOneInTx(tx, transfer.id);
    });
  }

  // ─── Views ───
  findAll() {
    return this.tenantPrisma.client.transfer.findMany({
      include: { lines: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const transfer = await this.tenantPrisma.client.transfer.findFirst({
      where: { id },
      include: { lines: true },  // ← sirf lines, stockItem nahi
    });
    if (!transfer) {
      throw new NotFoundException('Transfer nahi mila');
    }

    // Stock items alag se fetch karo (serialNumber ke liye chahiye)
    const stockItemIds = (transfer as any).lines.map((l: any) => l.stockItemId);
    const stockItems = await this.tenantPrisma.client.stockItem.findMany({
      where: { id: { in: stockItemIds } },
    });
    const stockItemMap = new Map(stockItems.map((s) => [s.id, s]));

    const meta = transfer.metadata as any;
    if (meta?.visibleColumns && meta?.sourceImportBatchId) {
      const batch = await this.tenantPrisma.client.importBatch.findFirst({
        where: { id: meta.sourceImportBatchId },
      });
      const batchRows = (batch?.rows as any[]) ?? [];

      const linesWithData = (transfer as any).lines.map((line: any) => {
        const stockItem = stockItemMap.get(line.stockItemId);
        const originalRow = batchRows.find((r) => r.trackingId === stockItem?.serialNumber);
        let filteredRowData: any = null;
        if (originalRow) {
          filteredRowData = {};
          for (const col of meta.visibleColumns) {
            filteredRowData[col] = originalRow[col];
          }
        }
        return { ...line, filteredRowData };
      });

      return { ...transfer, lines: linesWithData };
    }

    return transfer;
  }
  // Consolidated cross-branch stock view (Super Admin) — har branch mein kitna stock
  async consolidatedStock() {
    const grouped = await this.tenantPrisma.client.stockItem.groupBy({
      by: ['branchId', 'status'],
      _count: { id: true },
      _sum: { quantity: true },
    });
    return grouped.map((g) => ({
      branchId: g.branchId,
      status: g.status,
      itemCount: g._count.id,
      totalQuantity: g._sum.quantity ?? 0,
    }));
  }

  // ─── Helpers ───
  private async getTransferOrThrow(id: string) {
    const transfer = await this.tenantPrisma.client.transfer.findFirst({
      where: { id },
      include: { lines: true },
    });
    if (!transfer) {
      throw new NotFoundException('Transfer nahi mila');
    }
    return transfer;
  }

  private async findOneInTx(tx: any, id: string) {
    return tx.transfer.findFirst({ where: { id }, include: { lines: true } });
  }
}