import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { pinDigest, pinHmacKey } from './sentinelle-pin';

/**
 * Au démarrage, remplace chaque NIP encore stocké en clair par son empreinte
 * à clé (audit M5-02). Idempotent ; sans clé configurée en production, ne
 * fait rien et laisse l'alerte de `pinHmacKey()`.
 */
@Injectable()
export class SentinellePinMigrationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SentinellePinMigrationService.name);

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    void this.migratePlainPins().catch((error) =>
      this.logger.error(`[ALERTE] Conversion des NIP en empreintes interrompue : ${error?.message ?? error}`),
    );
  }

  async migratePlainPins(batchSize = 200) {
    const key = pinHmacKey();
    if (!key) return { converted: 0, skipped: 0 };
    let converted = 0;
    let skipped = 0;
    let cursor: string | undefined;
    for (;;) {
      const rows = await this.prisma.buildingEmployee.findMany({
        where: { pin: { not: null }, pinHash: null },
        select: { id: true, buildingId: true, pin: true },
        orderBy: { id: 'asc' },
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (!rows.length) break;
      for (const row of rows) {
        try {
          const result = await this.prisma.buildingEmployee.updateMany({
            where: { id: row.id, pin: row.pin, pinHash: null },
            data: { pinHash: pinDigest(row.buildingId, row.pin as string, key), pin: null },
          });
          converted += result.count;
        } catch {
          skipped += 1;
        }
      }
      cursor = rows[rows.length - 1].id;
      if (rows.length < batchSize) break;
    }
    if (converted || skipped) {
      this.logger.log(`NIP convertis en empreintes : ${converted}${skipped ? `, ${skipped} ignorés (doublon actif)` : ''}.`);
    }
    return { converted, skipped };
  }
}
