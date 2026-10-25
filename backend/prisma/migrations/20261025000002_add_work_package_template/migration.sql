-- CreateTable
CREATE TABLE "WorkPackageTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPackageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkPackageTemplateTradeCategory" (
    "workPackageTemplateId" TEXT NOT NULL,
    "tradeCategoryId" TEXT NOT NULL,

    CONSTRAINT "WorkPackageTemplateTradeCategory_pkey" PRIMARY KEY ("workPackageTemplateId","tradeCategoryId")
);

-- CreateTable
CREATE TABLE "WorkPackageTemplateItem" (
    "id" TEXT NOT NULL,
    "workPackageTemplateId" TEXT NOT NULL,
    "workTemplateId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkPackageTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkPackageTemplateItem_workPackageTemplateId_workTemplateId_key" ON "WorkPackageTemplateItem"("workPackageTemplateId", "workTemplateId");

-- AddForeignKey
ALTER TABLE "WorkPackageTemplate" ADD CONSTRAINT "WorkPackageTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageTemplate" ADD CONSTRAINT "WorkPackageTemplate_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "LibraryFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageTemplateTradeCategory" ADD CONSTRAINT "WorkPackageTemplateTradeCategory_workPackageTemplateId_fkey" FOREIGN KEY ("workPackageTemplateId") REFERENCES "WorkPackageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageTemplateTradeCategory" ADD CONSTRAINT "WorkPackageTemplateTradeCategory_tradeCategoryId_fkey" FOREIGN KEY ("tradeCategoryId") REFERENCES "TradeCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageTemplateItem" ADD CONSTRAINT "WorkPackageTemplateItem_workPackageTemplateId_fkey" FOREIGN KEY ("workPackageTemplateId") REFERENCES "WorkPackageTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkPackageTemplateItem" ADD CONSTRAINT "WorkPackageTemplateItem_workTemplateId_fkey" FOREIGN KEY ("workTemplateId") REFERENCES "WorkTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
