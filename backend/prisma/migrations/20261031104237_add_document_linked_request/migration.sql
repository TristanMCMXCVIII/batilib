-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "linkedRequestId" TEXT;

-- AlterTable
ALTER TABLE "ProjectDocumentRequest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "ProjectDocument" ADD CONSTRAINT "ProjectDocument_linkedRequestId_fkey" FOREIGN KEY ("linkedRequestId") REFERENCES "ProjectDocumentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
