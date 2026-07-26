-- AlterTable
ALTER TABLE "Review" ADD COLUMN "unlockTokenHash" TEXT;
ALTER TABLE "Review" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Review_unlockTokenHash_key" ON "Review"("unlockTokenHash");

-- CreateIndex
CREATE INDEX "Review_userId_status_idx" ON "Review"("userId", "status");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
