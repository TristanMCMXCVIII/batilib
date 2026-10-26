-- Add position to WorkItemTemplate
ALTER TABLE "WorkItemTemplate" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Initialise les positions par ordre de createdAt au sein de chaque dossier
UPDATE "WorkItemTemplate" w
SET position = sub.rn - 1
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "folderId" ORDER BY "createdAt" ASC) AS rn
    FROM "WorkItemTemplate"
) sub
WHERE w.id = sub.id;
