-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "repostCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "reposts" (
    "id" TEXT NOT NULL,
    "comment" VARCHAR(280),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "reposts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reposts_projectId_idx" ON "reposts"("projectId");

-- CreateIndex
CREATE INDEX "reposts_userId_createdAt_idx" ON "reposts"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reposts_userId_projectId_key" ON "reposts"("userId", "projectId");

-- AddForeignKey
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reposts" ADD CONSTRAINT "reposts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
