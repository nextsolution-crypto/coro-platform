-- Seed the new capabilities only after PostgreSQL commits their enum values.
-- No entitlement is created and no tenant is activated.
INSERT INTO "CommercialCapability" (
  "id", "code", "nameFr", "nameEn", "descriptionFr", "descriptionEn",
  "lifecycle", "isAvailable", "displayOrder", "createdAt", "updatedAt"
)
VALUES
  (gen_random_uuid()::text, 'INCIDENT_REPORTS', 'CORO Report', 'CORO Report', 'Rapports d incident gouvernes.', 'Governed incident reports.', 'CURRENT', true, 15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'OPERATIONAL_LOG', 'Main courante', 'Operational log', 'Main courante operationnelle.', 'Operational security log.', 'CURRENT', true, 16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'OPERATIONAL_SHIFTS', 'Quarts et releve', 'Shifts and handover', 'Gestion des quarts et de la releve.', 'Shift and handover management.', 'CURRENT', true, 17, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'OPERATIONAL_DIRECTIVES', 'Consignes', 'Directives', 'Consignes operationnelles gouvernees.', 'Governed operational directives.', 'CURRENT', true, 18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'OPERATIONAL_FOLLOWUPS', 'Suivis', 'Follow-ups', 'Suivis operationnels gouvernes.', 'Governed operational follow-ups.', 'CURRENT', true, 19, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SECURITY_WORKSTATION', 'Poste de securite', 'Security workstation', 'Poste de securite integre.', 'Integrated security workstation.', 'CURRENT', true, 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "CapabilityScopePolicy" (
  "id", "capabilityId", "scope", "status", "createdAt", "updatedAt"
)
SELECT gen_random_uuid()::text, capability."id", scope.value::"CommercialScope",
       CASE WHEN scope.value = 'SITE' THEN 'ALLOWED'::"CapabilityScopeStatus"
            ELSE 'NOT_ALLOWED'::"CapabilityScopeStatus" END,
       CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "CommercialCapability" capability
CROSS JOIN (VALUES ('ORGANIZATION'), ('CLIENT'), ('SITE')) AS scope(value)
WHERE capability."code" IN (
  'INCIDENT_REPORTS', 'OPERATIONAL_LOG', 'OPERATIONAL_SHIFTS',
  'OPERATIONAL_DIRECTIVES', 'OPERATIONAL_FOLLOWUPS', 'SECURITY_WORKSTATION'
)
ON CONFLICT ("capabilityId", "scope") DO NOTHING;
