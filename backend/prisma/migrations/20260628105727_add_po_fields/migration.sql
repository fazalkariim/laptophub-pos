/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,poNumber]` on the table `purchase_orders` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `purchase_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poNumber` to the `purchase_orders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "po_lines" ADD COLUMN     "receivedQty" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "amountPaid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "poNumber" TEXT NOT NULL,
ADD COLUMN     "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenantId_poNumber_key" ON "purchase_orders"("tenantId", "poNumber");
