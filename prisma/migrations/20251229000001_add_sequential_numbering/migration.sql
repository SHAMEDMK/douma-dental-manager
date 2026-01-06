-- Note: orderNumber and invoiceNumber columns already exist in the database
-- This migration only creates the DailySequence table for sequential numbering

-- Create DailySequence table to track daily sequential numbers
CREATE TABLE IF NOT EXISTS "DailySequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "orderSeq" INTEGER NOT NULL DEFAULT 0,
    "invoiceSeq" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailySequence_date_key" ON "DailySequence"("date");

