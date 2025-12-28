-- AlterTable: Add segment column to User table
ALTER TABLE "User" ADD COLUMN "segment" TEXT NOT NULL DEFAULT 'LABO';

-- AlterTable: Add segment price columns to Product table
ALTER TABLE "Product" ADD COLUMN "priceLabo" REAL;
ALTER TABLE "Product" ADD COLUMN "priceDentiste" REAL;
ALTER TABLE "Product" ADD COLUMN "priceRevendeur" REAL;

