-- À exécuter dans Neon SQL Editor sur la base Vercel PRODUCTION (pas preview/dev).
-- Corrige : column PurchaseOrder.shareToken does not exist

ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_shareToken_key" ON "PurchaseOrder"("shareToken");
