import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  NotFoundException,
} from '@nestjs/common';
import { from, mergeMap, Observable } from 'rxjs';
import { FamilyEntitlementService } from '../capability-entitlements/family-entitlement.service';
import {
  capabilityEnforcementMode,
  familyForClientPortalPath,
} from '../capability-entitlements/family-entitlement';

/**
 * M11-01 — client-portal routes of a family outside the client's contract are
 * hidden (404) when CAPABILITY_ENFORCEMENT=ENFORCE. In AUDIT (default) the
 * request goes through and the gap is logged, so grants can be put in place
 * before switching. Life-safety routes are never gated.
 */
@Injectable()
export class CapabilityEnforcementInterceptor implements NestInterceptor {
  private readonly logger = new Logger('CapabilityEnforcement');
  private readonly reported = new Map<string, number>();

  constructor(private readonly families: FamilyEntitlementService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const mode = capabilityEnforcementMode();
    if (mode === 'OFF') return next.handle();
    const request = context.switchToHttp().getRequest();
    const clientUser = request?.clientUser as
      | { clientId?: string; organizationId?: string }
      | undefined;
    if (!clientUser?.clientId || !clientUser.organizationId) return next.handle();
    const route = familyForClientPortalPath(String(request.originalUrl ?? request.url ?? ''));
    if (!route) return next.handle();
    return from(
      this.families.isEntitled({
        organizationId: clientUser.organizationId,
        clientId: clientUser.clientId,
        family: route.family,
        buildingId: route.buildingId,
      }),
    ).pipe(
      mergeMap((entitled) => {
        if (!entitled) {
          const key = `${clientUser.organizationId}:${clientUser.clientId}:${route.family}`;
          const last = this.reported.get(key) ?? 0;
          if (Date.now() - last > 60 * 60_000) {
            this.reported.set(key, Date.now());
            this.logger.warn(
              `${mode === 'ENFORCE' ? 'Refus' : 'Écart (audit)'} : client ${clientUser.clientId} sans droit ${route.family}`,
            );
          }
          if (mode === 'ENFORCE') throw new NotFoundException();
        }
        return next.handle();
      }),
    );
  }
}
