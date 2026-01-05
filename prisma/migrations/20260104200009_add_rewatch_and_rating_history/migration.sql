-- AlterTable
ALTER TABLE "WatchList" ADD COLUMN     "watchCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RewatchLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ratingBefore" DOUBLE PRECISION,
    "ratingAfter" DOUBLE PRECISION,
    "previousWatchCount" INTEGER NOT NULL,

    CONSTRAINT "RewatchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "actionType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewatchLog_userId_idx" ON "RewatchLog"("userId");

-- CreateIndex
CREATE INDEX "RewatchLog_tmdbId_mediaType_idx" ON "RewatchLog"("tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "RewatchLog_watchedAt_idx" ON "RewatchLog"("watchedAt");

-- CreateIndex
CREATE INDEX "RewatchLog_userId_watchedAt_idx" ON "RewatchLog"("userId", "watchedAt");

-- CreateIndex
CREATE INDEX "RatingHistory_userId_idx" ON "RatingHistory"("userId");

-- CreateIndex
CREATE INDEX "RatingHistory_tmdbId_mediaType_idx" ON "RatingHistory"("tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "RatingHistory_createdAt_idx" ON "RatingHistory"("createdAt");

-- CreateIndex
CREATE INDEX "RatingHistory_userId_tmdbId_mediaType_idx" ON "RatingHistory"("userId", "tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "WatchList_watchCount_idx" ON "WatchList"("watchCount");

-- AddForeignKey
ALTER TABLE "RewatchLog" ADD CONSTRAINT "RewatchLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewatchLog" ADD CONSTRAINT "RewatchLog_userId_tmdbId_mediaType_fkey" FOREIGN KEY ("userId", "tmdbId", "mediaType") REFERENCES "WatchList"("userId", "tmdbId", "mediaType") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_userId_tmdbId_mediaType_fkey" FOREIGN KEY ("userId", "tmdbId", "mediaType") REFERENCES "WatchList"("userId", "tmdbId", "mediaType") ON DELETE NO ACTION ON UPDATE NO ACTION;
