-- DropTable
DROP TABLE "WorkPackageTemplateItem";

-- DropTable
DROP TABLE "WorkPackageTemplateTradeCategory";

-- AlterTable: replace N:N trade category with simple FK
ALTER TABLE "WorkPackageTemplate" ADD COLUMN "tradeCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkPackageTemplate" ADD CONSTRAINT "WorkPackageTemplate_tradeCategoryId_fkey" FOREIGN KEY ("tradeCategoryId") REFERENCES "TradeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
