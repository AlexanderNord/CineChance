-- CreateIndex
CREATE INDEX "Blacklist_userId_createdAt_idx" ON "Blacklist"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WatchList_userId_statusId_addedAt_idx" ON "WatchList"("userId", "statusId", "addedAt");
