-- AlterTable
ALTER TABLE "ProjectDocument" ADD COLUMN     "linkedRequestedByOrgName" TEXT;

-- AlterTable
ALTER TABLE "ProjectDocumentRequest" ADD COLUMN     "fulfilledAt" TIMESTAMP(3),
ADD COLUMN     "fulfilledDocumentId" TEXT;

-- AddForeignKey
ALTER TABLE "ProjectDocumentRequest" ADD CONSTRAINT "ProjectDocumentRequest_fulfilledDocumentId_fkey" FOREIGN KEY ("fulfilledDocumentId") REFERENCES "ProjectDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
