-- AlterTable
ALTER TABLE "user" ADD COLUMN "notifyToken" TEXT;
ALTER TABLE "user" ADD COLUMN "notifyLikes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user" ADD COLUMN "notifyReplies" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "user" ADD COLUMN "notifyNewReviews" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "likeNotifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ManagerFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManagerFollow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notifyToken_key" ON "user"("notifyToken");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerFollow_userId_managerId_key" ON "ManagerFollow"("userId", "managerId");

-- CreateIndex
CREATE INDEX "ManagerFollow_managerId_idx" ON "ManagerFollow"("managerId");

-- AddForeignKey
ALTER TABLE "ManagerFollow" ADD CONSTRAINT "ManagerFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManagerFollow" ADD CONSTRAINT "ManagerFollow_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "Manager"("id") ON DELETE CASCADE ON UPDATE CASCADE;
