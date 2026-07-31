-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'REMOVED');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'HARASSMENT', 'STOLEN_WORK', 'SEXUAL_CONTENT', 'VIOLENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "handle" TEXT,
    "bio" VARCHAR(280),
    "website" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "redistributable" BOOLEAN NOT NULL DEFAULT true,
    "commercialUse" BOOLEAN NOT NULL DEFAULT true,
    "embedding" BOOLEAN NOT NULL DEFAULT true,
    "modification" BOOLEAN NOT NULL DEFAULT true,
    "sellingFontItself" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fonts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "designers" TEXT[],
    "subsets" TEXT[],
    "weights" INTEGER[],
    "hasItalic" BOOLEAN NOT NULL DEFAULT false,
    "isVariable" BOOLEAN NOT NULL DEFAULT false,
    "popularity" INTEGER NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "dateAdded" TIMESTAMP(3) NOT NULL,
    "lastModified" TIMESTAMP(3) NOT NULL,
    "sourceRepo" TEXT NOT NULL DEFAULT 'github.com/google/fonts',
    "sourcePath" TEXT NOT NULL,
    "licenseFile" TEXT NOT NULL,
    "isCommercial" BOOLEAN NOT NULL DEFAULT false,
    "purchaseUrl" TEXT,
    "licenseId" TEXT NOT NULL,

    CONSTRAINT "fonts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "font_axes" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "min" DOUBLE PRECISION NOT NULL,
    "max" DOUBLE PRECISION NOT NULL,
    "defaultValue" DOUBLE PRECISION NOT NULL,
    "fontId" TEXT NOT NULL,

    CONSTRAINT "font_axes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "font_variants" (
    "id" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "style" TEXT NOT NULL DEFAULT 'normal',
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "fontId" TEXT NOT NULL,

    CONSTRAINT "font_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kits" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brief" TEXT,
    "slug" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_fonts" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "weights" INTEGER[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitId" TEXT NOT NULL,
    "fontId" TEXT NOT NULL,

    CONSTRAINT "kit_fonts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "type_scales" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "baseSize" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "ratio" DOUBLE PRECISION NOT NULL DEFAULT 1.25,
    "stepsUp" INTEGER NOT NULL DEFAULT 5,
    "stepsDown" INTEGER NOT NULL DEFAULT 2,
    "rounding" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "kitId" TEXT NOT NULL,

    CONSTRAINT "type_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scale_steps" (
    "id" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "px" DOUBLE PRECISION NOT NULL,
    "lineHeight" DOUBLE PRECISION NOT NULL,
    "letterSpacing" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kitId" TEXT NOT NULL,
    "scaleId" TEXT NOT NULL,

    CONSTRAINT "scale_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palettes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "harmony" TEXT NOT NULL DEFAULT 'monochrome',
    "kitId" TEXT NOT NULL,

    CONSTRAINT "palettes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "swatches" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "hex" TEXT NOT NULL,
    "l" DOUBLE PRECISION NOT NULL,
    "c" DOUBLE PRECISION NOT NULL,
    "h" DOUBLE PRECISION NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "kitId" TEXT NOT NULL,
    "paletteId" TEXT NOT NULL,

    CONSTRAINT "swatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contrast_pairs" (
    "id" TEXT NOT NULL,
    "ratio" DOUBLE PRECISION NOT NULL,
    "passesAA" BOOLEAN NOT NULL,
    "passesAAA" BOOLEAN NOT NULL,
    "level" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitId" TEXT NOT NULL,
    "foregroundId" TEXT NOT NULL,
    "backgroundId" TEXT NOT NULL,

    CONSTRAINT "contrast_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitId" TEXT NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "board_items" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,

    CONSTRAINT "board_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_meta" (
    "id" TEXT NOT NULL,
    "dominantHexes" TEXT[],
    "detectedFonts" TEXT[],
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "extracted_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "label" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kitId" TEXT NOT NULL,

    CONSTRAINT "kit_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "artefactUrl" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "kitId" TEXT NOT NULL,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identify_requests" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "inputUrl" TEXT,
    "imageUrl" TEXT,
    "results" JSONB NOT NULL,
    "savedToKit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "identify_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" VARCHAR(2000),
    "sourceUrl" TEXT,
    "sourceCredit" VARCHAR(200),
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "saveCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ProjectStatus" NOT NULL DEFAULT 'PUBLISHED',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "blobPath" TEXT NOT NULL,
    "alt" VARCHAR(200),
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_fonts" (
    "id" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "fontSlug" TEXT,
    "role" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_fonts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_colours" (
    "id" TEXT NOT NULL,
    "hex" VARCHAR(9) NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_colours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tags" (
    "projectId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "project_tags_pkey" PRIMARY KEY ("projectId","tagId")
);

-- CreateTable
CREATE TABLE "likes" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(500),
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saves" (
    "id" TEXT NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_members" (
    "id" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "conversation_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "detail" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "reporterId" TEXT NOT NULL,
    "projectId" TEXT,
    "messageId" TEXT,
    "userId" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowEnds" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_handle_key" ON "users"("handle");

-- CreateIndex
CREATE INDEX "users_handle_idx" ON "users"("handle");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "fonts_slug_key" ON "fonts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "fonts_family_key" ON "fonts"("family");

-- CreateIndex
CREATE INDEX "fonts_category_popularity_idx" ON "fonts"("category", "popularity");

-- CreateIndex
CREATE INDEX "fonts_popularity_idx" ON "fonts"("popularity");

-- CreateIndex
CREATE UNIQUE INDEX "font_axes_fontId_tag_key" ON "font_axes"("fontId", "tag");

-- CreateIndex
CREATE UNIQUE INDEX "font_variants_fontId_weight_style_key" ON "font_variants"("fontId", "weight", "style");

-- CreateIndex
CREATE UNIQUE INDEX "kits_slug_key" ON "kits"("slug");

-- CreateIndex
CREATE INDEX "kits_ownerId_updatedAt_idx" ON "kits"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "kit_fonts_kitId_idx" ON "kit_fonts"("kitId");

-- CreateIndex
CREATE UNIQUE INDEX "kit_fonts_kitId_role_key" ON "kit_fonts"("kitId", "role");

-- CreateIndex
CREATE INDEX "type_scales_kitId_idx" ON "type_scales"("kitId");

-- CreateIndex
CREATE INDEX "scale_steps_kitId_idx" ON "scale_steps"("kitId");

-- CreateIndex
CREATE UNIQUE INDEX "scale_steps_scaleId_step_key" ON "scale_steps"("scaleId", "step");

-- CreateIndex
CREATE INDEX "palettes_kitId_idx" ON "palettes"("kitId");

-- CreateIndex
CREATE INDEX "swatches_kitId_idx" ON "swatches"("kitId");

-- CreateIndex
CREATE UNIQUE INDEX "swatches_paletteId_role_key" ON "swatches"("paletteId", "role");

-- CreateIndex
CREATE INDEX "contrast_pairs_kitId_passesAA_idx" ON "contrast_pairs"("kitId", "passesAA");

-- CreateIndex
CREATE UNIQUE INDEX "contrast_pairs_foregroundId_backgroundId_key" ON "contrast_pairs"("foregroundId", "backgroundId");

-- CreateIndex
CREATE INDEX "boards_kitId_idx" ON "boards"("kitId");

-- CreateIndex
CREATE INDEX "board_items_kitId_idx" ON "board_items"("kitId");

-- CreateIndex
CREATE UNIQUE INDEX "extracted_meta_itemId_key" ON "extracted_meta"("itemId");

-- CreateIndex
CREATE INDEX "extracted_meta_kitId_idx" ON "extracted_meta"("kitId");

-- CreateIndex
CREATE INDEX "kit_versions_kitId_createdAt_idx" ON "kit_versions"("kitId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "kit_versions_kitId_version_key" ON "kit_versions"("kitId", "version");

-- CreateIndex
CREATE INDEX "export_jobs_kitId_createdAt_idx" ON "export_jobs"("kitId", "createdAt");

-- CreateIndex
CREATE INDEX "identify_requests_expiresAt_idx" ON "identify_requests"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_slug_key" ON "projects"("slug");

-- CreateIndex
CREATE INDEX "projects_status_publishedAt_idx" ON "projects"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "projects_authorId_publishedAt_idx" ON "projects"("authorId", "publishedAt");

-- CreateIndex
CREATE INDEX "projects_likeCount_idx" ON "projects"("likeCount");

-- CreateIndex
CREATE INDEX "project_images_projectId_position_idx" ON "project_images"("projectId", "position");

-- CreateIndex
CREATE INDEX "project_fonts_projectId_idx" ON "project_fonts"("projectId");

-- CreateIndex
CREATE INDEX "project_fonts_fontSlug_idx" ON "project_fonts"("fontSlug");

-- CreateIndex
CREATE INDEX "project_colours_projectId_idx" ON "project_colours"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "project_tags_tagId_idx" ON "project_tags"("tagId");

-- CreateIndex
CREATE INDEX "likes_projectId_idx" ON "likes"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "likes_userId_projectId_key" ON "likes"("userId", "projectId");

-- CreateIndex
CREATE INDEX "collections_ownerId_updatedAt_idx" ON "collections"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "collections_ownerId_slug_key" ON "collections"("ownerId", "slug");

-- CreateIndex
CREATE INDEX "saves_userId_createdAt_idx" ON "saves"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "saves_projectId_idx" ON "saves"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "saves_collectionId_projectId_key" ON "saves"("collectionId", "projectId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_members_userId_idx" ON "conversation_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_members_conversationId_userId_key" ON "conversation_members"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "blocks_blockedId_idx" ON "blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "blocks_blockerId_blockedId_key" ON "blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "reports_projectId_idx" ON "reports"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE INDEX "rate_limits_windowEnds_idx" ON "rate_limits"("windowEnds");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fonts" ADD CONSTRAINT "fonts_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_axes" ADD CONSTRAINT "font_axes_fontId_fkey" FOREIGN KEY ("fontId") REFERENCES "fonts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "font_variants" ADD CONSTRAINT "font_variants_fontId_fkey" FOREIGN KEY ("fontId") REFERENCES "fonts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kits" ADD CONSTRAINT "kits_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_fonts" ADD CONSTRAINT "kit_fonts_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_fonts" ADD CONSTRAINT "kit_fonts_fontId_fkey" FOREIGN KEY ("fontId") REFERENCES "fonts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "type_scales" ADD CONSTRAINT "type_scales_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scale_steps" ADD CONSTRAINT "scale_steps_scaleId_fkey" FOREIGN KEY ("scaleId") REFERENCES "type_scales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palettes" ADD CONSTRAINT "palettes_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swatches" ADD CONSTRAINT "swatches_paletteId_fkey" FOREIGN KEY ("paletteId") REFERENCES "palettes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrast_pairs" ADD CONSTRAINT "contrast_pairs_foregroundId_fkey" FOREIGN KEY ("foregroundId") REFERENCES "swatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contrast_pairs" ADD CONSTRAINT "contrast_pairs_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "swatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_items" ADD CONSTRAINT "board_items_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_meta" ADD CONSTRAINT "extracted_meta_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "board_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kit_versions" ADD CONSTRAINT "kit_versions_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_kitId_fkey" FOREIGN KEY ("kitId") REFERENCES "kits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_fonts" ADD CONSTRAINT "project_fonts_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_colours" ADD CONSTRAINT "project_colours_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tags" ADD CONSTRAINT "project_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "likes" ADD CONSTRAINT "likes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saves" ADD CONSTRAINT "saves_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_members" ADD CONSTRAINT "conversation_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
