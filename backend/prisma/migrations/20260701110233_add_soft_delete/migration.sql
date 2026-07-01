-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "deletedAt" TIMESTAMP(3);
