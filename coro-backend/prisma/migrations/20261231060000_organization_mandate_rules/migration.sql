-- Règles des mandats par organisation (valeurs par défaut CORO).
ALTER TABLE "Organization"
  ADD COLUMN "mandateTargetMarginPercent" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "mandateLongThresholdHours" INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN "mandateShortDeliveryDays" INTEGER NOT NULL DEFAULT 21,
  ADD COLUMN "mandateLongDeliveryDays" INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN "evacuationPlanDeliveryDays" INTEGER NOT NULL DEFAULT 10;
