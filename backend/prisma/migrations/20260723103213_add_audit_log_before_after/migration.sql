-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "afterData" JSONB,
ADD COLUMN     "beforeData" JSONB;
