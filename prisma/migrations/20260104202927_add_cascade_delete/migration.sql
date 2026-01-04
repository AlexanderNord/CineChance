-- DropForeignKey
ALTER TABLE "RatingHistory" DROP CONSTRAINT "RatingHistory_userId_tmdbId_mediaType_fkey";

-- DropForeignKey
ALTER TABLE "RewatchLog" DROP CONSTRAINT "RewatchLog_userId_tmdbId_mediaType_fkey";

-- AddForeignKey
ALTER TABLE "RewatchLog" ADD CONSTRAINT "RewatchLog_userId_tmdbId_mediaType_fkey" FOREIGN KEY ("userId", "tmdbId", "mediaType") REFERENCES "WatchList"("userId", "tmdbId", "mediaType") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RatingHistory" ADD CONSTRAINT "RatingHistory_userId_tmdbId_mediaType_fkey" FOREIGN KEY ("userId", "tmdbId", "mediaType") REFERENCES "WatchList"("userId", "tmdbId", "mediaType") ON DELETE CASCADE ON UPDATE NO ACTION;
