CREATE INDEX "DisplayCorrectionObservation_priority_status_updatedAt_idx"
  ON "DisplayCorrectionObservation"("suggestedPriority", "status", "updatedAt");

ALTER TABLE "DisplayCorrectionObservation"
  ADD CONSTRAINT "DisplayCorrectionObservation_description_plain_text_check"
  CHECK (
    char_length(btrim("description")) BETWEEN 10 AND 4000
    AND "description" !~ '[<>]'
    AND "description" !~ '[[:cntrl:]]'
  );

CREATE FUNCTION "coro_display_observation_identity_immutable"()
RETURNS trigger AS $$
BEGIN
  IF ROW(
    NEW."reference", NEW."organizationId", NEW."clientId", NEW."buildingId",
    NEW."floorId", NEW."locationId", NEW."publicationId",
    NEW."publicationVersion", NEW."variantVersion", NEW."variantSha256",
    NEW."category", NEW."description", NEW."suggestedPriority",
    NEW."normalizedX", NEW."normalizedY", NEW."submittedByClientUserId",
    NEW."submissionRequestId", NEW."submittedAt", NEW."createdAt"
  ) IS DISTINCT FROM ROW(
    OLD."reference", OLD."organizationId", OLD."clientId", OLD."buildingId",
    OLD."floorId", OLD."locationId", OLD."publicationId",
    OLD."publicationVersion", OLD."variantVersion", OLD."variantSha256",
    OLD."category", OLD."description", OLD."suggestedPriority",
    OLD."normalizedX", OLD."normalizedY", OLD."submittedByClientUserId",
    OLD."submissionRequestId", OLD."submittedAt", OLD."createdAt"
  ) THEN
    RAISE EXCEPTION 'DISPLAY_OBSERVATION_IDENTITY_IMMUTABLE' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DisplayCorrectionObservation_identity_immutable"
BEFORE UPDATE ON "DisplayCorrectionObservation"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_identity_immutable"();

CREATE FUNCTION "coro_display_observation_no_delete"()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'DISPLAY_OBSERVATION_APPEND_ONLY' USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "DisplayCorrectionObservation_no_delete"
BEFORE DELETE ON "DisplayCorrectionObservation"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_no_delete"();

CREATE TRIGGER "DisplayCorrectionObservationEvent_append_only"
BEFORE UPDATE OR DELETE ON "DisplayCorrectionObservationEvent"
FOR EACH ROW EXECUTE FUNCTION "coro_display_observation_no_delete"();
