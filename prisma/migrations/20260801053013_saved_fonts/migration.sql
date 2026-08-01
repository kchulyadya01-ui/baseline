-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "fontCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "saved_fonts" (
    "id" TEXT NOT NULL,
    "fontSlug" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "saved_fonts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_fonts_userId_createdAt_idx" ON "saved_fonts"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "saved_fonts_fontSlug_idx" ON "saved_fonts"("fontSlug");

-- CreateIndex
CREATE UNIQUE INDEX "saved_fonts_collectionId_fontSlug_key" ON "saved_fonts"("collectionId", "fontSlug");

-- AddForeignKey
ALTER TABLE "saved_fonts" ADD CONSTRAINT "saved_fonts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_fonts" ADD CONSTRAINT "saved_fonts_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
