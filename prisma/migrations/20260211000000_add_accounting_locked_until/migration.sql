-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN IF NOT EXISTS "accountingLockedUntil" TIMESTAMP(3);
