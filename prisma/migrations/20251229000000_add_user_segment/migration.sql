-- AlterTable: Add segment column to User table
-- Note: priceLabo, priceDentiste, priceRevendeur were already added in migration 20251228190805_add_user_segment
-- This migration only adds the segment column to User
ALTER TABLE "User" ADD COLUMN "segment" TEXT NOT NULL DEFAULT 'LABO';
