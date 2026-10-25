-- AlterTable: add defaultMarginRate to WorkPackageTemplate
ALTER TABLE "WorkPackageTemplate" ADD COLUMN "defaultMarginRate" DECIMAL(65,30);

-- AlterTable: add informative source link on WorkPackage
ALTER TABLE "WorkPackage" ADD COLUMN "sourceWorkPackageTemplateId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_sourceWorkPackageTemplateId_fkey" FOREIGN KEY ("sourceWorkPackageTemplateId") REFERENCES "WorkPackageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
