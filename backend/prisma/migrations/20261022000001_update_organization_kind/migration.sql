-- AlterEnum: replace PERSONAL_GROUP/BUSINESS with 3 business types
BEGIN;
CREATE TYPE "OrganizationKind_new" AS ENUM ('BUILDING_COMPANY', 'CLIENT_COMPANY', 'INDIVIDUAL_CLIENT');
ALTER TABLE "Organization" ALTER COLUMN "kind" TYPE "OrganizationKind_new" USING ("kind"::text::"OrganizationKind_new");
ALTER TYPE "OrganizationKind" RENAME TO "OrganizationKind_old";
ALTER TYPE "OrganizationKind_new" RENAME TO "OrganizationKind";
DROP TYPE "public"."OrganizationKind_old";
COMMIT;

-- Enforce uniqueness of FOUNDER role per organization (partial unique index)
CREATE UNIQUE INDEX "one_founder_per_org"
  ON "OrganizationMembership"("organizationId")
  WHERE role = 'FOUNDER';
