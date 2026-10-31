/*
  Warnings:

  - You are about to drop the column `linkedRequestId` on the `ProjectDocument` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectDocument" DROP CONSTRAINT "ProjectDocument_linkedRequestId_fkey";

-- AlterTable
ALTER TABLE "ProjectDocument" DROP COLUMN "linkedRequestId",
ADD COLUMN     "linkedRequestNote" TEXT;
