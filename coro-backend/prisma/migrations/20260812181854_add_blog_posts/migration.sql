-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleFr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "excerptFr" TEXT,
    "excerptEn" TEXT,
    "contentFr" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "coverImage" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "authorName" TEXT NOT NULL DEFAULT 'Équipe CORO',
    "authorTitle" TEXT NOT NULL DEFAULT 'Experts en conformité',
    "seoTitleFr" TEXT,
    "seoTitleEn" TEXT,
    "seoDescFr" TEXT,
    "seoDescEn" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");
