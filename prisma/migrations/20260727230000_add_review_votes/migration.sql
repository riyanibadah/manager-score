-- AlterTable
ALTER TABLE "Review" ADD COLUMN "upvotes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Review" ADD COLUMN "downvotes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ReviewReply" ADD COLUMN "upvotes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewReply" ADD COLUMN "downvotes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT,
    "replyId" TEXT,
    "voterKey" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "voterIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_reviewId_voterKey_key" ON "ReviewVote"("reviewId", "voterKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewVote_replyId_voterKey_key" ON "ReviewVote"("replyId", "voterKey");

-- CreateIndex
CREATE INDEX "ReviewVote_voterKey_idx" ON "ReviewVote"("voterKey");

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ReviewReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
