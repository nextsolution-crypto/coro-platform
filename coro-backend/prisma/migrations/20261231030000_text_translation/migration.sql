-- Mémoire des traductions automatiques (ajout seul, compatible avec la version précédente)
CREATE TABLE "TextTranslation" (
    "id" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "sourceText" TEXT NOT NULL,
    "translatedText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TextTranslation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TextTranslation_sourceHash_targetLang_key" ON "TextTranslation"("sourceHash", "targetLang");
