-- AlterTable: Add orderNumber to Order table
ALTER TABLE "Order" ADD COLUMN "orderNumber" TEXT;
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- AlterTable: Add invoiceNumber to Invoice table
ALTER TABLE "Invoice" ADD COLUMN "invoiceNumber" TEXT;
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateTable: DailySequence to track daily sequential numbers
CREATE TABLE "DailySequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "orderSeq" INTEGER NOT NULL DEFAULT 0,
    "invoiceSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "DailySequence_date_key" ON "DailySequence"("date");

