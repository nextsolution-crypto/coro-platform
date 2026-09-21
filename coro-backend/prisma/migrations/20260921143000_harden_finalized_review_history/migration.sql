CREATE OR REPLACE FUNCTION protect_operational_review_children() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status "OperationalReviewStatus";
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT "status" INTO parent_status FROM "OperationalReview"
    WHERE "id" = OLD."operationalReviewId" FOR SHARE;
    IF parent_status = 'FINALIZED' THEN
      RAISE EXCEPTION 'FINALIZED OperationalReview children are immutable';
    END IF;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT "status" INTO parent_status FROM "OperationalReview"
    WHERE "id" = NEW."operationalReviewId" FOR SHARE;
    IF parent_status = 'FINALIZED' THEN
      RAISE EXCEPTION 'FINALIZED OperationalReview children are immutable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION prevent_late_review_action() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE review_status "OperationalReviewStatus";
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW."reviewRecommendationId" IS NOT DISTINCT FROM OLD."reviewRecommendationId" THEN RETURN NEW; END IF;
    IF OLD."reviewRecommendationId" IS NOT NULL THEN
      SELECT review."status" INTO review_status
      FROM "ReviewRecommendation" recommendation
      JOIN "OperationalReview" review ON review."id" = recommendation."operationalReviewId"
      WHERE recommendation."id" = OLD."reviewRecommendationId"
        AND recommendation."organizationId" = OLD."organizationId"
      FOR SHARE OF review;
      IF review_status = 'FINALIZED' THEN
        RAISE EXCEPTION 'FINALIZED OperationalReview action link is immutable';
      END IF;
    END IF;
  END IF;
  IF NEW."reviewRecommendationId" IS NULL THEN RETURN NEW; END IF;
  SELECT review."status" INTO review_status
  FROM "ReviewRecommendation" recommendation
  JOIN "OperationalReview" review ON review."id" = recommendation."operationalReviewId"
  WHERE recommendation."id" = NEW."reviewRecommendationId"
    AND recommendation."organizationId" = NEW."organizationId"
  FOR SHARE OF review;
  IF review_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'FINALIZED OperationalReview cannot receive new CorrectiveAction';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER "CorrectiveAction_review_finalized_guard"
BEFORE INSERT OR UPDATE OF "reviewRecommendationId" ON "CorrectiveAction"
FOR EACH ROW EXECUTE FUNCTION prevent_late_review_action();
