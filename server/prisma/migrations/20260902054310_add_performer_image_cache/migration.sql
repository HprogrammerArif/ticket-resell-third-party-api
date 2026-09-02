-- CreateTable
CREATE TABLE "PerformerImageCache" (
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "sourcePage" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformerImageCache_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE INDEX "PerformerImageCache_cachedAt_idx" ON "PerformerImageCache"("cachedAt");
