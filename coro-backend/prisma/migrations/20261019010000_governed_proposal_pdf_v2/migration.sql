ALTER TABLE "ProposalDocument"
  ADD COLUMN "compositionSnapshotId" TEXT,
  ADD COLUMN "compositionSnapshotHash" CHAR(64),
  ADD COLUMN "compositionReadiness" "ProposalDocumentCompositionReadiness";

ALTER TABLE "ProposalDocument"
  ADD CONSTRAINT "ProposalDocument_composition_source_check" CHECK (
    ("compositionSnapshotId" IS NULL AND "compositionSnapshotHash" IS NULL AND "compositionReadiness" IS NULL)
    OR
    ("compositionSnapshotId" IS NOT NULL AND "compositionSnapshotHash" IS NOT NULL AND "compositionReadiness" IS NOT NULL)
  );

CREATE INDEX "ProposalDocument_compositionSnapshotId_idx"
  ON "ProposalDocument"("compositionSnapshotId");

ALTER TABLE "ProposalDocument"
  ADD CONSTRAINT "ProposalDocument_compositionSnapshotId_fkey"
  FOREIGN KEY ("compositionSnapshotId")
  REFERENCES "ProposalDocumentCompositionSnapshot"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
