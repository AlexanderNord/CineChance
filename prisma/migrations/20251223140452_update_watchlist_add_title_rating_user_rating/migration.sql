/*
  Warnings:

  - The primary key for the `WatchList` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `WatchList` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,tmdbId,mediaType]` on the table `WatchList` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `WatchList` table without a default value. This is not possible if the table is not empty.
  - Added the required column `voteAverage` to the `WatchList` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WatchList_userId_tmdbId_mediaType_statusId_key";

-- AlterTable
ALTER TABLE "WatchList" DROP CONSTRAINT "WatchList_pkey",
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "userRating" INTEGER,
ADD COLUMN     "voteAverage" DOUBLE PRECISION NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "WatchList_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "WatchList_statusId_idx" ON "WatchList"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchList_userId_tmdbId_mediaType_key" ON "WatchList"("userId", "tmdbId", "mediaType");
