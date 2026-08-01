-- CreateTable
CREATE TABLE "project_credits" (
    "id" TEXT NOT NULL,
    "role" VARCHAR(60),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "project_credits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_credits_userId_createdAt_idx" ON "project_credits"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "project_credits_projectId_userId_key" ON "project_credits"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "project_credits" ADD CONSTRAINT "project_credits_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_credits" ADD CONSTRAINT "project_credits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
