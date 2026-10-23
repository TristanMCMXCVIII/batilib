-- CreateEnum
CREATE TYPE "OrganizationMemberRole" AS ENUM ('FOUNDER', 'MANAGER', 'MEMBER');

-- DropForeignKey
ALTER TABLE "OrganizationMembership" DROP CONSTRAINT "OrganizationMembership_organizationRoleId_fkey";

-- DropForeignKey
ALTER TABLE "OrganizationRole" DROP CONSTRAINT "OrganizationRole_organizationId_fkey";

-- AlterTable
ALTER TABLE "OrganizationMembership" DROP COLUMN "organizationRoleId",
ADD COLUMN     "role" "OrganizationMemberRole" NOT NULL DEFAULT 'MEMBER';

-- DropTable
DROP TABLE "OrganizationRole";

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
