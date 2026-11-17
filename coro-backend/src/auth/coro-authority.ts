import type {
  ClientOperationalPermission,
  ClientUserRole,
  PlatformPermission,
  UserRole,
} from '@prisma/client';

export type CoroAuthority = InternalUserAuthority | ClientUserAuthority;

export interface AuthorityBase {
  organizationId: string;
  sessionVersion: number;
}

export interface InternalUserAuthority extends AuthorityBase {
  actorType: 'USER';
  actorId: string;
  role: UserRole;
  permissions: readonly PlatformPermission[];
}

export interface ClientUserAuthority extends AuthorityBase {
  actorType: 'CLIENT_USER';
  actorId: string;
  clientId: string;
  role: ClientUserRole;
  permissions: readonly ClientOperationalPermission[];
  buildingIds: readonly string[];
}

interface CanonicalClientIdentity {
  id: string;
  clientId: string;
  organizationId: string;
  role: ClientUserRole;
  sessionVersion: number;
  operationalPermissions: readonly ClientOperationalPermission[];
  operationalAssignments: readonly { buildingId: string }[];
}

/**
 * Builds portal authority exclusively from the canonical identity loaded by
 * ClientJwtGuard. No actor type, permission or assignment supplied by a
 * browser is accepted by this boundary.
 */
export function clientAuthorityFromCanonicalIdentity(
  identity: CanonicalClientIdentity,
): ClientUserAuthority {
  return Object.freeze({
    actorType: 'CLIENT_USER' as const,
    actorId: identity.id,
    clientId: identity.clientId,
    organizationId: identity.organizationId,
    role: identity.role,
    sessionVersion: identity.sessionVersion,
    permissions: Object.freeze([...(identity.operationalPermissions ?? [])]),
    buildingIds: Object.freeze(
      [...(identity.operationalAssignments ?? [])].map(
        (assignment) => assignment.buildingId,
      ),
    ),
  });
}

export function isClientUserAuthority(
  authority: CoroAuthority,
): authority is ClientUserAuthority {
  return authority.actorType === 'CLIENT_USER';
}
