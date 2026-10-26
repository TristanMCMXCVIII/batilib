-- CreateEnum
CREATE TYPE "LotColor" AS ENUM (
  'NAVY',
  'BLUE',
  'SKY',
  'CYAN',
  'INDIGO',
  'VIOLET',
  'PURPLE',
  'FUCHSIA',
  'PINK',
  'ROSE',
  'RED',
  'ORANGE',
  'AMBER',
  'SLATE',
  'ZINC',
  'STONE'
);

-- AlterTable
ALTER TABLE "WorkPackageTemplate" ADD COLUMN "color" "LotColor";

-- AlterTable
ALTER TABLE "WorkPackage" ADD COLUMN "color" "LotColor";
