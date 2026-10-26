-- AlterTable
ALTER TABLE "WorkTemplate" ADD COLUMN "workPackageTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkTemplate" ADD CONSTRAINT "WorkTemplate_workPackageTemplateId_fkey" FOREIGN KEY ("workPackageTemplateId") REFERENCES "WorkPackageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
