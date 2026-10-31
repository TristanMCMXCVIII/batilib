-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "commercialDoc" TEXT,
ADD COLUMN     "technicalDoc" TEXT;

-- AlterTable
ALTER TABLE "WorkItemTemplate" ADD COLUMN     "commercialDoc" TEXT,
ADD COLUMN     "technicalDoc" TEXT;
