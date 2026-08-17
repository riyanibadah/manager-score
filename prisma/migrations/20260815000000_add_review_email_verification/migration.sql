-- AlterTable
ALTER TABLE "Review" ADD COLUMN "verifyTokenHash" TEXT;
ALTER TABLE "Review" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Review_verifyTokenHash_key" ON "Review"("verifyTokenHash");
