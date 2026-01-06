-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryNoteNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_deliveryNoteNumber_key" ON "Order"("deliveryNoteNumber");
