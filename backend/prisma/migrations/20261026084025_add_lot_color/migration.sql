-- DropForeignKey
ALTER TABLE "LibraryFolder" DROP CONSTRAINT "LibraryFolder_workPackageTemplateId_fkey";

-- AddForeignKey
ALTER TABLE "LibraryFolder" ADD CONSTRAINT "LibraryFolder_workPackageTemplateId_fkey" FOREIGN KEY ("workPackageTemplateId") REFERENCES "WorkPackageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
