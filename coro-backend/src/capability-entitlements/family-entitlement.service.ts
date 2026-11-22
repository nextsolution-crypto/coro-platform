import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementResolver } from './entitlement-resolver.service';
import { ENFORCED_FAMILIES, EnforcedFamily } from './family-entitlement';

type Resolution = Awaited<ReturnType<EntitlementResolver['resolve']>>;

function effective(resolution: Resolution | null) {
  return Boolean(
    resolution?.availability.isAvailable &&
      resolution.licensed &&
      resolution.enabled &&
      resolution.effectiveState === 'EFFECTIVE',
  );
}

/**
 * A family is entitled when a contract grant is effective for the building,
 * for the client, or for the whole organisation — whichever exists.
 */
@Injectable()
export class FamilyEntitlementService {
  private readonly logger = new Logger(FamilyEntitlementService.name);
  private readonly cache = new Map<string, { value: boolean; until: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: EntitlementResolver,
  ) {}

  async isEntitled(input: {
    organizationId: string;
    clientId: string;
    family: EnforcedFamily;
    buildingId?: string | null;
  }): Promise<boolean> {
    const key = `${input.organizationId}:${input.clientId}:${input.buildingId ?? '-'}:${input.family}`;
    const cached = this.cache.get(key);
    if (cached && cached.until > Date.now()) return cached.value;
    let value = false;
    try {
      const scopes: Array<{ clientId?: string; buildingId?: string }> = [];
      if (input.buildingId) {
        const building = await this.prisma.building.findFirst({
          where: { id: input.buildingId, organizationId: input.organizationId },
          select: { id: true },
        });
        if (building) scopes.push({ clientId: input.clientId, buildingId: building.id });
      }
      scopes.push({ clientId: input.clientId }, {});
      for (const scope of scopes) {
        const resolution = await this.resolver.resolve({
          organizationId: input.organizationId,
          capabilityCode: input.family,
          ...scope,
        });
        if (effective(resolution)) {
          value = true;
          break;
        }
      }
    } catch (error) {
      this.logger.warn(
        `Résolution du droit ${input.family} impossible : ${error instanceof Error ? error.message : String(error)}`,
      );
      value = false;
    }
    this.cache.set(key, { value, until: Date.now() + 60_000 });
    return value;
  }

  async familiesFor(input: { organizationId: string; clientId: string }) {
    const entries = await Promise.all(
      ENFORCED_FAMILIES.map(async (family) => [
        family,
        await this.isEntitled({ ...input, family }),
      ] as const),
    );
    return Object.fromEntries(entries) as Record<EnforcedFamily, boolean>;
  }
}
