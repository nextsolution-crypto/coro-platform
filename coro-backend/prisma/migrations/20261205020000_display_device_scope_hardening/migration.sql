-- DISPLAY-06C independent review: additive scope constraints.
-- The original migration remains immutable. Redundant weak FKs are retained.
CREATE UNIQUE INDEX "DisplayLocation_device_scope_key"
  ON "DisplayLocation"("id", "organizationId", "buildingId");

CREATE UNIQUE INDEX "DisplayDevice_org_scope_key"
  ON "DisplayDevice"("id", "organizationId");

ALTER TABLE "DisplayDevice"
  ADD CONSTRAINT "DisplayDevice_location_scope_fkey"
  FOREIGN KEY ("locationId", "organizationId", "buildingId")
  REFERENCES "DisplayLocation"("id", "organizationId", "buildingId")
  ON DELETE RESTRICT;

ALTER TABLE "DisplayDeviceEnrollmentInvitation"
  ADD CONSTRAINT "DisplayDeviceInvitation_location_scope_fkey"
  FOREIGN KEY ("locationId", "organizationId", "buildingId")
  REFERENCES "DisplayLocation"("id", "organizationId", "buildingId")
  ON DELETE RESTRICT;

ALTER TABLE "DisplayDeviceNonce"
  ADD CONSTRAINT "DisplayDeviceNonce_device_scope_fkey"
  FOREIGN KEY ("deviceId", "organizationId")
  REFERENCES "DisplayDevice"("id", "organizationId")
  ON DELETE RESTRICT;

ALTER TABLE "DisplayDeviceAssignment"
  ADD CONSTRAINT "DisplayDeviceAssignment_location_scope_fkey"
  FOREIGN KEY ("locationId", "organizationId", "buildingId")
  REFERENCES "DisplayLocation"("id", "organizationId", "buildingId")
  ON DELETE RESTRICT;

ALTER TABLE "DisplayDeviceManifestSequence"
  ADD CONSTRAINT "DisplayDeviceManifestSequence_device_scope_fkey"
  FOREIGN KEY ("deviceId", "organizationId")
  REFERENCES "DisplayDevice"("id", "organizationId")
  ON DELETE RESTRICT;

ALTER TABLE "DisplayDeviceSync"
  ADD CONSTRAINT "DisplayDeviceSync_publication_scope_fkey"
  FOREIGN KEY ("publicationId", "organizationId", "buildingId")
  REFERENCES "DisplayPlanPublication"("id", "organizationId", "buildingId")
  ON DELETE RESTRICT;
