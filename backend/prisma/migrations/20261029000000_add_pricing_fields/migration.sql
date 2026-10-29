-- AlterTable
ALTER TABLE "Project" ADD COLUMN "defaultMarginRate" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "WorkPackage" ADD COLUMN "marginRate" DECIMAL(65,30);

-- AlterTable
ALTER TABLE "WorkItem"
ADD COLUMN "puEstimeHt" DECIMAL(65,30),
ADD COLUMN "puSubcontractorHt" DECIMAL(65,30),
ADD COLUMN "quantitySubcontractor" DECIMAL(65,30),
ADD COLUMN "marginRate" DECIMAL(65,30),
ADD COLUMN "tauxTva" DECIMAL(65,30) NOT NULL DEFAULT 0.10;
