-- Supplier.isActive (align schema avec UI fournisseurs)
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
