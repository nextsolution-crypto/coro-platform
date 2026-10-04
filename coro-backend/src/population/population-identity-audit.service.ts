import { createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';

type IdentityAuditSubscriber = {
  programId: string;
  status: string;
  email: string | null;
  emailCanonical: string | null;
  phoneCanonical: string | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
  verificationCount: number;
  consentEventCount: number;
  smsEvidenceCount: number;
  alertDeliveryCount: number;
};

@Injectable()
export class PopulationIdentityAuditService {
  audit(subscribers: IdentityAuditSubscriber[], hmacKey: string) {
    if (hmacKey.length < 32) {
      throw new Error(
        'POPULATION_IDENTITY_AUDIT_HMAC_KEY must contain at least 32 characters',
      );
    }
    const groups = new Map<
      string,
      {
        programId: string;
        identityType: 'EMAIL' | 'PHONE';
        value: string;
        rows: IdentityAuditSubscriber[];
      }
    >();
    const add = (
      subscriber: IdentityAuditSubscriber,
      identityType: 'EMAIL' | 'PHONE',
      value: string | null,
    ) => {
      if (!value) return;
      const key = `${subscriber.programId}\u0000${identityType}\u0000${value}`;
      const current = groups.get(key) ?? {
        programId: subscriber.programId,
        identityType,
        value,
        rows: [],
      };
      current.rows.push(subscriber);
      groups.set(key, current);
    };
    for (const subscriber of subscribers) {
      if (
        !['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED'].includes(
          subscriber.status,
        )
      ) {
        continue;
      }
      add(
        subscriber,
        'EMAIL',
        subscriber.emailCanonical ??
          subscriber.email?.trim().toLowerCase() ??
          null,
      );
      add(subscriber, 'PHONE', subscriber.phoneCanonical);
    }
    return [...groups.values()]
      .filter((group) => group.rows.length > 1)
      .map((group) => ({
        programId: group.programId,
        identityType: group.identityType,
        fingerprint: createHmac('sha256', hmacKey)
          .update(`${group.identityType}\u0000${group.value}`)
          .digest('hex'),
        subscriberCount: group.rows.length,
        statuses: [...new Set(group.rows.map((row) => row.status))].sort(),
        verificationCount: group.rows.reduce(
          (sum, row) => sum + row.verificationCount,
          0,
        ),
        consentEventCount: group.rows.reduce(
          (sum, row) => sum + row.consentEventCount,
          0,
        ),
        smsEvidenceCount: group.rows.reduce(
          (sum, row) => sum + row.smsEvidenceCount,
          0,
        ),
        alertDeliveryCount: group.rows.reduce(
          (sum, row) => sum + row.alertDeliveryCount,
          0,
        ),
        firstCreatedAt: new Date(
          Math.min(...group.rows.map((row) => row.createdAt.getTime())),
        ),
        lastActivityAt: new Date(
          Math.max(
            ...group.rows.flatMap((row) => [
              row.createdAt.getTime(),
              row.updatedAt.getTime(),
              row.verifiedAt?.getTime() ?? 0,
            ]),
          ),
        ),
      }))
      .sort((left, right) =>
        `${left.programId}:${left.identityType}:${left.fingerprint}`.localeCompare(
          `${right.programId}:${right.identityType}:${right.fingerprint}`,
        ),
      );
  }
}
