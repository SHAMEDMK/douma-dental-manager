-- AlterTable: Add discountRate to User
ALTER TABLE "User" ADD COLUMN "discountRate" REAL;

-- AlterTable: Add cost to Product
ALTER TABLE "Product" ADD COLUMN "cost" REAL NOT NULL DEFAULT 0;

-- AlterTable: Add costAtTime to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "costAtTime" REAL NOT NULL DEFAULT 0;

