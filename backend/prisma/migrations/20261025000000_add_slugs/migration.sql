-- Add slug columns (nullable first to allow backfill)
ALTER TABLE "Organization" ADD COLUMN "slug" TEXT;
ALTER TABLE "Project" ADD COLUMN "slug" TEXT;

-- Backfill organization slugs (apply lower() FIRST, then strip non-alphanum, then spaces→dashes)
WITH base AS (
  SELECT
    id,
    regexp_replace(
      regexp_replace(lower(name), '[^a-z0-9 -]', '', 'g'),
      ' +', '-', 'g'
    ) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9 -]', '', 'g'),
        ' +', '-', 'g'
      )
      ORDER BY "createdAt"
    ) AS rn
  FROM "Organization"
)
UPDATE "Organization" o
SET slug = CASE
  WHEN b.base_slug = '' OR b.base_slug = '-' THEN 'organisation-' || b.rn
  WHEN b.rn = 1 THEN b.base_slug
  ELSE b.base_slug || '-' || b.rn
END
FROM base b
WHERE o.id = b.id;

-- Backfill project slugs (unique within org)
WITH base AS (
  SELECT
    id,
    "leadOrganizationId",
    regexp_replace(
      regexp_replace(lower(name), '[^a-z0-9 -]', '', 'g'),
      ' +', '-', 'g'
    ) AS base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY "leadOrganizationId", regexp_replace(
        regexp_replace(lower(name), '[^a-z0-9 -]', '', 'g'),
        ' +', '-', 'g'
      )
      ORDER BY "createdAt"
    ) AS rn
  FROM "Project"
)
UPDATE "Project" p
SET slug = CASE
  WHEN b.base_slug = '' OR b.base_slug = '-' THEN 'projet-' || b.rn
  WHEN b.rn = 1 THEN b.base_slug
  ELSE b.base_slug || '-' || b.rn
END
FROM base b
WHERE p.id = b.id;

-- Set NOT NULL constraints
ALTER TABLE "Organization" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;

-- Add unique constraints
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Project_leadOrganizationId_slug_key" ON "Project"("leadOrganizationId", "slug");
