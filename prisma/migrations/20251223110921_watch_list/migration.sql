/*
  Warnings:

  - You are about to drop the column `status` on the `WatchList` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,tmdbId,mediaType,statusId]` on the table `WatchList` will be added. If there are existing duplicate values, this will fail.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `statusId` to the `WatchList` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WatchList_userId_tmdbId_mediaType_status_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;

-- AlterTable
ALTER TABLE "WatchList" DROP COLUMN "status",
ADD COLUMN     "statusId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "MovieStatus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "MovieStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MovieStatus_name_key" ON "MovieStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "WatchList_userId_tmdbId_mediaType_statusId_key" ON "WatchList"("userId", "tmdbId", "mediaType", "statusId");

-- AddForeignKey
ALTER TABLE "WatchList" ADD CONSTRAINT "WatchList_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "MovieStatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
