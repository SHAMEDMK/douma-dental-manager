-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryCity" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "deliveredAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "deliveryAgentName" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveredToName" TEXT;
ALTER TABLE "Order" ADD COLUMN "deliveryProofNote" TEXT;
