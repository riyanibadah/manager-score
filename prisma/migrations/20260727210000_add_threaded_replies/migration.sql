-- AlterTable
ALTER TABLE "ReviewReply" ADD COLUMN "parentId" TEXT;

-- Short replies legitimately repeat ("Agreed", "Same here"), so an identical
-- body must not block a submission. The hash stays as a spam-detection signal.
-- DropIndex
DROP INDEX "ReviewReply_submissionHash_key";

-- CreateIndex
CREATE INDEX "ReviewReply_submissionHash_idx" ON "ReviewReply"("submissionHash");

-- CreateIndex
CREATE INDEX "ReviewReply_parentId_idx" ON "ReviewReply"("parentId");

-- AddForeignKey
ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ReviewReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
