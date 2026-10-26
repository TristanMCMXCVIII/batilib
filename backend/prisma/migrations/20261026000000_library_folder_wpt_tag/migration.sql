-- Add workPackageTemplateId to LibraryFolder (tag semantique : ce dossier = ce lot)
ALTER TABLE "LibraryFolder"
  ADD COLUMN "workPackageTemplateId" TEXT REFERENCES "WorkPackageTemplate"(id) ON DELETE SET NULL;

-- Drop workPackageTemplateId from WorkItemTemplate (le WPT est desormais derive du dossier)
ALTER TABLE "WorkItemTemplate"
  DROP COLUMN "workPackageTemplateId";
