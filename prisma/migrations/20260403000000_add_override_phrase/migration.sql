-- AlterTable: add overridePhrase column to User with default "OVERRIDE"
ALTER TABLE "User" ADD COLUMN "overridePhrase" TEXT NOT NULL DEFAULT 'OVERRIDE';
