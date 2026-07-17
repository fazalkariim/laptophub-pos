-- AlterTable
ALTER TABLE "stock_items" ADD COLUMN     "buyer" TEXT,
ADD COLUMN     "finalSalePrice" DECIMAL(12,2),
ADD COLUMN     "lastScan" TEXT,
ADD COLUMN     "receivedOn" TIMESTAMP(3),
ADD COLUMN     "saleAt" TEXT,
ADD COLUMN     "transactionDate" TIMESTAMP(3),
ADD COLUMN     "vendorId" TEXT,
ADD COLUMN     "vendorQuotedCost" DECIMAL(12,2),
ADD COLUMN     "vendorTrackingId" TEXT;

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRows" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "failedCount" INTEGER NOT NULL,
    "rows" JSONB NOT NULL,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "import_batches_tenantId_idx" ON "import_batches"("tenantId");

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
