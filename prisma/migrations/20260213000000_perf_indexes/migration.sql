-- Performance indexes for hot tables (orders, invoices, payments, stock, users).
-- See docs/PERF_AUDIT.md for rationale.

-- User: listes clients/livreurs par rôle et par date
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- StockMovement: listes par produit et par date
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- Order: listes/filtres par user, statut, date
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- Invoice: filtres statut, tri par date
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- Payment: jointures et listes par facture/date
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_invoiceId_createdAt_idx" ON "Payment"("invoiceId", "createdAt");
