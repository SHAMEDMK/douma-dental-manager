-- StockMovement.source : traçabilité (MANUAL, PURCHASE_RECEIPT, ORDER_OUT, …)
-- Idempotent : OK si la colonne existe déjà (ex. ajoutée par db push).
ALTER TABLE "StockMovement" ADD COLUMN IF NOT EXISTS "source" TEXT;

CREATE INDEX IF NOT EXISTS "StockMovement_source_idx" ON "StockMovement"("source");
