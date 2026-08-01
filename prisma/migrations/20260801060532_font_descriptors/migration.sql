-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "font_descriptors" (
    "id" TEXT NOT NULL,
    "fontSlug" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "descriptor" vector(1568) NOT NULL,
    "xHeightRatio" DOUBLE PRECISION NOT NULL,
    "widthRatio" DOUBLE PRECISION NOT NULL,
    "strokeWeight" DOUBLE PRECISION NOT NULL,
    "strokeContrast" DOUBLE PRECISION NOT NULL,
    "hasSerifs" BOOLEAN NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "font_descriptors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "font_descriptors_fontSlug_key" ON "font_descriptors"("fontSlug");

-- CreateIndex
CREATE INDEX "font_descriptors_category_idx" ON "font_descriptors"("category");
