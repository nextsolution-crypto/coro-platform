-- CLIENT-01D: additive commercial capabilities for selective portal activation.
-- This migration creates no entitlement and activates no tenant.
ALTER TYPE "CapabilityCode" ADD VALUE IF NOT EXISTS 'INCIDENT_REPORTS';
ALTER TYPE "CapabilityCode" ADD VALUE IF NOT EXISTS 'OPERATIONAL_LOG';
ALTER TYPE "CapabilityCode" ADD VALUE IF NOT EXISTS 'OPERATIONAL_SHIFTS';
ALTER TYPE "CapabilityCode" ADD VALUE IF NOT EXISTS 'OPERATIONAL_DIRECTIVES';
ALTER TYPE "CapabilityCode" ADD VALUE IF NOT EXISTS 'OPERATIONAL_FOLLOWUPS';
ALTER TYPE "CapabilityCode" ADD VALUE IF NOT EXISTS 'SECURITY_WORKSTATION';
