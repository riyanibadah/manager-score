-- CreateTable
CREATE TABLE "ReviewReply" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorRole" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "submissionHash" TEXT NOT NULL,
    "submitterIpHash" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewSubscription" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "confirmToken" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "subscriberIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewSubscription_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ReviewReport" ADD COLUMN "replyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewReply_submissionHash_key" ON "ReviewReply"("submissionHash");

-- CreateIndex
CREATE INDEX "ReviewReply_reviewId_status_idx" ON "ReviewReply"("reviewId", "status");

-- CreateIndex
CREATE INDEX "ReviewReply_status_createdAt_idx" ON "ReviewReply"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSubscription_confirmToken_key" ON "ReviewSubscription"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSubscription_unsubscribeToken_key" ON "ReviewSubscription"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "ReviewSubscription_reviewId_confirmedAt_idx" ON "ReviewSubscription"("reviewId", "confirmedAt");

-- CreateIndex
CREATE INDEX "ReviewSubscription_subscriberIpHash_createdAt_idx" ON "ReviewSubscription"("subscriberIpHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewSubscription_reviewId_email_key" ON "ReviewSubscription"("reviewId", "email");

-- CreateIndex
CREATE INDEX "ReviewReport_replyId_idx" ON "ReviewReport"("replyId");

-- AddForeignKey
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewSubscription" ADD CONSTRAINT "ReviewSubscription_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_replyId_fkey" FOREIGN KEY ("replyId") REFERENCES "ReviewReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
