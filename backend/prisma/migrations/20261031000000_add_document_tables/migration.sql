-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('PLAN', 'ADMIN', 'FINANCE', 'TECHNIQUE', 'EXPERTISE', 'CONTRACT', 'PV', 'PHOTO', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentScope" AS ENUM ('GLOBAL', 'CLIENT', 'WORKPACKAGE');

-- CreateEnum
CREATE TYPE "DocumentRequestStatus" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProjectDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedByMembershipId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "scope" "DocumentScope" NOT NULL DEFAULT 'GLOBAL',
    "workPackageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDocumentRequest" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "requestedByMembershipId" TEXT NOT NULL,
    "requestedFromRole" "ProjectParticipantRole" NOT NULL,
    "requestedFromWorkPackageId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "DocumentRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectDocumentRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_uploadedByMembershipId_fkey"
    FOREIGN KEY ("uploadedByMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_workPackageId_fkey"
    FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocumentRequest" ADD CONSTRAINT "ProjectDocumentRequest_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocumentRequest" ADD CONSTRAINT "ProjectDocumentRequest_requestedByMembershipId_fkey"
    FOREIGN KEY ("requestedByMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDocumentRequest" ADD CONSTRAINT "ProjectDocumentRequest_requestedFromWorkPackageId_fkey"
    FOREIGN KEY ("requestedFromWorkPackageId") REFERENCES "WorkPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
