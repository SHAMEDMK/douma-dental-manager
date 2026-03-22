-- Supplier.code : identifiant métier unique (format SUP-0001)

-- 1) Colonne nullable pour backfill sans contrainte NOT NULL immédiate
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- 2) Backfill des lignes existantes (ordre stable)
UPDATE "Supplier" AS s
SET "code" = v."new_code"
FROM (
  SELECT id, 'SUP-' || LPAD(ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC)::text, 4, '0') AS new_code
  FROM "Supplier"
  WHERE "code" IS NULL
) AS v
WHERE s.id = v.id;

-- 3) Synchroniser GlobalSequence pour la prochaine attribution automatique
INSERT INTO "GlobalSequence" ("id", "key", "seq", "updatedAt")
SELECT
  md5(random()::text || clock_timestamp()::text)::text,
  'SUPPLIER',
  GREATEST(
    0,
    COALESCE(
      (
        SELECT MAX(
          CASE
            WHEN "code" ~ '^SUP-[0-9]+$' THEN SUBSTRING("code" FROM 5)::integer
            ELSE 0
          END
        )
        FROM "Supplier"
      ),
      0
    )
  ),
  CURRENT_TIMESTAMP
ON CONFLICT ("key") DO UPDATE SET
  "seq" = GREATEST("GlobalSequence"."seq", EXCLUDED."seq"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- 4) NOT NULL + unicité
ALTER TABLE "Supplier" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Supplier_code_key" ON "Supplier"("code");

-- 5) isActive (fournisseur actif / inactif)
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
