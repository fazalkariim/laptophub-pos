import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { ParsedRow, RowResult } from './bulk-import-v2.types';
import { TransfersService } from '../transfers/transfers.service';

const VALID_STATUSES = ['IN_STOCK', 'SOLD', 'IN_TRANSIT', 'RESERVED', 'RETURNED'];

interface CurrentUser {
  userId: string;
  tenantId: string;
  branchId: string | null;
  role: string;
}

@Injectable()
export class BulkImportV2Service {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly transfersService: TransfersService,
  ) {}

  // File buffer ko rows mein parse karo (headers se map karke)
  private parseFile(buffer: Buffer): ParsedRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });

    return raw.map((r, i) => ({
      no: i + 1,
      location: r['Location']?.toString().trim(),
      lastScan: r['Last Scan']?.toString().trim() || undefined,
      category: r['Category']?.toString().trim(),
      brand: r['Brand']?.toString().trim() || undefined,
      trackingId: r['Tracking ID']?.toString().trim(),
      specs: r['Specs']?.toString().trim(),
      costByVS: r['Cost by V.S'] !== undefined && r['Cost by V.S'] !== '' ? Number(r['Cost by V.S']) : undefined,
      finalSale: r['Final Sale'] !== undefined && r['Final Sale'] !== '' ? Number(r['Final Sale']) : undefined,
      buyer: r['Buyer']?.toString().trim() || undefined,
      date: r['Date']?.toString().trim() || undefined,
      status: r['Status']?.toString().trim() || undefined,
      saleAt: r['Sale @']?.toString().trim() || undefined,
      vendor: r['Vendor']?.toString().trim() || undefined,
      vendorTrackingId: r['Vendor Tracking ID']?.toString().trim() || undefined,
      receivedOn: r['Received on']?.toString().trim() || undefined,
      purchase: r['Purchase'] !== undefined && r['Purchase'] !== '' ? Number(r['Purchase']) : undefined,
    }));
  }

  // Supplier resolve/create — exact naam match
  private async resolveSupplier(name: string | undefined, tx: any, tenantId: string): Promise<string | null> {
    if (!name) return null;
    const existing = await tx.supplier.findFirst({ where: { tenantId, name } });
    if (existing) return existing.id;
    const created = await tx.supplier.create({ data: { tenantId, name } as any });
    return created.id;
  }

  // Product resolve/create — exact brand+category+specs match
  private async resolveProduct(
    row: ParsedRow,
    tx: any,
    tenantId: string,
  ): Promise<{ id: string } | null> {
    const brand = row.brand ?? '';
    const category = row.category!;
    const specs = row.specs!;

    const existing = await tx.product.findFirst({
      where: { tenantId, brand, category, specs, deletedAt: null },
    });
    if (existing) return existing;

    const sku = `AUTO-${row.trackingId}`;
    const model = specs.slice(0, 100);

    const created = await tx.product.create({
      data: { tenantId, brand, category, specs, sku, model } as any,
    });
    return created;
  }

  // Ek row validate + process karo (naya import ya retry, dono is se guzarte hain)
  private async processRow(row: ParsedRow, branches: any[], user: CurrentUser): Promise<RowResult> {
    const base = { ...row };
    try {
      const missing: string[] = [];
      if (!row.location) missing.push('Location');
      if (!row.category) missing.push('Category');
      if (!row.trackingId) missing.push('Tracking ID');
      if (!row.specs) missing.push('Specs');
      if (row.purchase === undefined || isNaN(row.purchase)) missing.push('Purchase');
      if (missing.length > 0) {
        throw new Error(`Zaroori field(s) missing: ${missing.join(', ')}`);
      }

      const branch = branches.find((b) => b.name === row.location);
      if (!branch) {
        throw new Error(`Branch '${row.location}' nahi mili`);
      }

      let status = 'IN_STOCK';
      if (row.status) {
        const upper = row.status.toUpperCase();
        if (!VALID_STATUSES.includes(upper)) {
          throw new Error(`Status '${row.status}' invalid hai`);
        }
        status = upper;
      }

      const existingStock = await this.tenantPrisma.client.stockItem.findFirst({
        where: { serialNumber: row.trackingId },
      });
      if (existingStock) {
        throw new Error('Tracking ID already exists');
      }

      await this.tenantPrisma.client.$transaction(async (tx: any) => {
        const product = await this.resolveProduct(row, tx, user.tenantId);
        const vendorId = await this.resolveSupplier(row.vendor, tx, user.tenantId);
        await tx.stockItem.create({
          data: {
            branchId: branch.id,
            productId: product!.id,
            serialNumber: row.trackingId,
            status,
            costPrice: row.purchase,
            lastScan: row.lastScan ?? null,
            vendorQuotedCost: row.costByVS ?? null,
            finalSalePrice: row.finalSale ?? null,
            buyer: row.buyer ?? null,
            transactionDate: row.date ? new Date(row.date) : null,
            saleAt: row.saleAt ?? null,
            vendorId,
            vendorTrackingId: row.vendorTrackingId ?? null,
            receivedOn: row.receivedOn ? new Date(row.receivedOn) : null,
          } as any,
        });
      });

      return { ...base, result: 'success' };
    } catch (e: any) {
      return { ...base, result: 'failed', reason: e.message };
    }
  }

  async bulkImport(fileBuffer: Buffer, fileName: string, user: CurrentUser) {
    const rows = this.parseFile(fileBuffer);
    if (rows.length === 0) {
      throw new BadRequestException('File mein koi row nahi mili');
    }

    // Branches ek baar laao (naam-match ke liye)
    const branches = await this.tenantPrisma.client.branch.findMany({
      where: { isActive: true } as any,
    });

    const results: RowResult[] = [];
    let successCount = 0;

    for (const row of rows) {
      const result = await this.processRow(row, branches, user);
      results.push(result);
      if (result.result === 'success') successCount++;
    }

    // ImportBatch record — hamesha banti hai, chahe sab fail hon
    const batch = await this.tenantPrisma.client.importBatch.create({
      data: {
        uploadedById: user.userId,
        fileName,
        totalRows: rows.length,
        successCount,
        failedCount: rows.length - successCount,
        rows: results as any,
      } as any,
    });

    return {
      imported: successCount,
      failedCount: rows.length - successCount,
      failed: results.filter((r) => r.result === 'failed'),
      importBatchId: batch.id,
    };
  }

  // Failed row edit + retry
  async editAndRetryRow(batchId: string, rowNo: number, dto: any, user: CurrentUser) {
    const batch = await this.tenantPrisma.client.importBatch.findFirst({
      where: { id: batchId },
    });
    if (!batch) {
      throw new NotFoundException('Import batch nahi mila');
    }

    const rows = batch.rows as any[];
    const rowIndex = rows.findIndex((r) => r.no === rowNo);
    if (rowIndex === -1) {
      throw new NotFoundException('Row nahi mili');
    }

    const existingRow = rows[rowIndex];
    if (existingRow.result === 'success') {
      throw new BadRequestException('Ye row already successful hai, edit nahi ho sakti');
    }

    // Purane row data ke upar naye fields merge karo
    const mergedRow: ParsedRow = { ...existingRow, ...dto, no: rowNo };

    // Branches (validation ke liye)
    const branches = await this.tenantPrisma.client.branch.findMany({
      where: { isActive: true } as any,
    });

    // Wahi validation+creation logic dobara chalao
    const result = await this.processRow(mergedRow, branches, user);

    // Batch ke rows array mein is row ko update karo
    rows[rowIndex] = result;

    const newSuccessCount = result.result === 'success' ? batch.successCount + 1 : batch.successCount;
    const newFailedCount = result.result === 'success' ? batch.failedCount - 1 : batch.failedCount;

    await this.tenantPrisma.client.importBatch.update({
      where: { id: batchId },
      data: {
        rows: rows as any,
        successCount: newSuccessCount,
        failedCount: newFailedCount,
      } as any,
    });

    if (result.result === 'failed') {
      throw new BadRequestException(result.reason);
    }

    return result;
  }

  // Batch ke stock items ko transfer karo (visible columns ke saath)
  async transferFromBatch(
    batchId: string,
    dto: { stockItemIds: string[]; destBranchId: string; visibleColumns?: string[]; note?: string },
    user: CurrentUser,
  ) {
    const batch = await this.tenantPrisma.client.importBatch.findFirst({ where: { id: batchId } });
    if (!batch) {
      throw new NotFoundException('Import batch nahi mila');
    }

    // Stock items ka current branch pata karo (source)
    const items = await this.tenantPrisma.client.stockItem.findMany({
      where: { id: { in: dto.stockItemIds } },
    });
    if (items.length === 0) {
      throw new BadRequestException('Koi stock items nahi mile');
    }
    const sourceBranchId = items[0].branchId;

    // Existing transfer service reuse — same rules (scoping, oversell check waghaira)
    const transfer = await this.transfersService.createTransfer(
      {
        sourceBranchId,
        destBranchId: dto.destBranchId,
        stockItemIds: dto.stockItemIds,
        note: dto.note,
      },
      user,
    );

    // Metadata (visibleColumns + batch reference) update karo
    await this.tenantPrisma.client.transfer.update({
      where: { id: transfer.id },
      data: {
        metadata: {
          visibleColumns: dto.visibleColumns ?? [],
          sourceImportBatchId: batchId,
        },
      } as any,
    });

    return transfer;
  }

  // List — summary fields only
  async listBatches() {
    const batches = await this.tenantPrisma.client.importBatch.findMany({
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
    return batches.map((b: any) => ({
      id: b.id,
      fileName: b.fileName,
      uploadedAt: b.uploadedAt,
      uploadedByName: b.uploadedBy?.name ?? 'Unknown',
      totalRows: b.totalRows,
      successCount: b.successCount,
      failedCount: b.failedCount,
    }));
  }

  // Detail — full rows
  async getBatch(id: string) {
    const batch = await this.tenantPrisma.client.importBatch.findFirst({
      where: { id },
      include: { uploadedBy: { select: { name: true } } },
    });
    if (!batch) {
      throw new BadRequestException('Import batch nahi mila');
    }
    return batch;
  }

  // ImportBatch delete — sirf history record, StockItem ko touch nahi karta
  async deleteBatch(id: string) {
    const batch = await this.tenantPrisma.client.importBatch.findFirst({
      where: { id },
    });
    if (!batch) {
      throw new NotFoundException('Import batch nahi mila');
    }

    await this.tenantPrisma.client.importBatch.delete({
      where: { id },
    });

    return { message: 'Upload history delete kar di gayi' };
  }
}