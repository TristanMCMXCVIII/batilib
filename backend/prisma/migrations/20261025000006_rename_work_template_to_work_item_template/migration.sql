-- Rename table
ALTER TABLE "WorkTemplate" RENAME TO "WorkItemTemplate";

-- Rename primary key constraint
ALTER TABLE "WorkItemTemplate" RENAME CONSTRAINT "WorkTemplate_pkey" TO "WorkItemTemplate_pkey";

-- Rename FK constraints on WorkItemTemplate
ALTER TABLE "WorkItemTemplate" RENAME CONSTRAINT "WorkTemplate_organizationId_fkey" TO "WorkItemTemplate_organizationId_fkey";
ALTER TABLE "WorkItemTemplate" RENAME CONSTRAINT "WorkTemplate_folderId_fkey" TO "WorkItemTemplate_folderId_fkey";
ALTER TABLE "WorkItemTemplate" RENAME CONSTRAINT "WorkTemplate_tradeCategoryId_fkey" TO "WorkItemTemplate_tradeCategoryId_fkey";
ALTER TABLE "WorkItemTemplate" RENAME CONSTRAINT "WorkTemplate_workPackageTemplateId_fkey" TO "WorkItemTemplate_workPackageTemplateId_fkey";

-- Rename sourceWorkTemplateId column on WorkItem and update its FK
ALTER TABLE "WorkItem" DROP CONSTRAINT "WorkItem_sourceWorkTemplateId_fkey";
ALTER TABLE "WorkItem" RENAME COLUMN "sourceWorkTemplateId" TO "sourceWorkItemTemplateId";
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_sourceWorkItemTemplateId_fkey" FOREIGN KEY ("sourceWorkItemTemplateId") REFERENCES "WorkItemTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
