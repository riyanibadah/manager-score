-- Written defensively: every statement is safe to re-run, so this migration
-- applies cleanly whether or not an earlier attempt got part way through.

-- AlterTable
ALTER TABLE "ReviewReply" ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Short replies legitimately repeat ("Agreed", "Same here"), so an identical
-- body must not block a submission. The hash stays as a spam-detection signal.
-- DropIndex
DROP INDEX IF EXISTS "ReviewReply_submissionHash_key";

-- The unique index may instead exist as a table constraint depending on how it
-- was created; drop that form too if present.
ALTER TABLE "ReviewReply" DROP CONSTRAINT IF EXISTS "ReviewReply_submissionHash_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReviewReply_submissionHash_idx" ON "ReviewReply"("submissionHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReviewReply_parentId_idx" ON "ReviewReply"("parentId");

-- AddForeignKey
DO $$
BEGIN
  ALTER TABLE "ReviewReply" ADD CONSTRAINT "ReviewReply_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "ReviewReply"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
