\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "Organization"
    WHERE id = 'qr001-preexisting-org'
      AND name = 'QR-001 preexisting sentinel'
  ) THEN
    RAISE EXCEPTION 'Preexisting organization sentinel was not preserved';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM "QrCode"
    WHERE slug = 'contact'
      AND "permanentPath" = '/qr/contact'
      AND "destinationUrl" = 'https://getcoro.io/contact'
      AND status = 'ACTIVE'
      AND "configurationVersion" = 1
  ) THEN
    RAISE EXCEPTION 'QR contact provisioning is missing or invalid';
  END IF;
END $$;

SELECT id, name FROM "Organization" WHERE id = 'qr001-preexisting-org';
SELECT slug, "permanentPath", "destinationUrl", status FROM "QrCode";
