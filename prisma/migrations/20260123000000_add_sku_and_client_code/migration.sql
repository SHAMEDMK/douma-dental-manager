-- AlterTable
ALTER TABLE "Product" ADD COLUMN "sku" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "clientCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_clientCode_key" ON "User"("clientCode");
