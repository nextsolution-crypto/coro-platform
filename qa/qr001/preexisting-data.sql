\set ON_ERROR_STOP on

INSERT INTO "Organization" (id, name, "updatedAt")
VALUES ('qr001-preexisting-org', 'QR-001 preexisting sentinel', CURRENT_TIMESTAMP);

SELECT id, name
FROM "Organization"
WHERE id = 'qr001-preexisting-org';
