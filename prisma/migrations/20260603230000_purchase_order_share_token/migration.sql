-- Lien public signé stable par commande fournisseur (généré à l'envoi)
ALTER TABLE "PurchaseOrder" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_shareToken_key" ON "PurchaseOrder"("shareToken");
