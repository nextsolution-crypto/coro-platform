import { ForbiddenException } from '@nestjs/common';

export type WorkManagementActor = {
  userId: string;
  organizationId: string;
  role: string;
};

const INTERNAL_ROLES = ['OPERATOR', 'ADMIN', 'SUPER_ADMIN'];

export function requireInternal(actor: WorkManagementActor) {
  if (!INTERNAL_ROLES.includes(actor?.role)) throw new ForbiddenException('Accès interdit');
}

export function requireTenantAdmin(actor: WorkManagementActor) {
  if (!['ADMIN', 'SUPER_ADMIN'].includes(actor?.role)) throw new ForbiddenException('Accès interdit');
}

export function requireSuperAdmin(actor: WorkManagementActor) {
  if (actor?.role !== 'SUPER_ADMIN') throw new ForbiddenException('Accès interdit');
}
