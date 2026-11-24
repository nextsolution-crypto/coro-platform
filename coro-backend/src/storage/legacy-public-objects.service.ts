import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

/**
 * Retire la lecture publique des anciens fichiers clients de coro-storage.
 *
 * Jusqu'en octobre-novembre 2026, certains fichiers étaient envoyés en lecture publique :
 * fichiers de projet (avant le 19 oct.), PDF officiels historiques et copies PDF des plans
 * approuvés. L'application les lit déjà par des requêtes signées ; seul leur lien public
 * restait ouvert. Ce service passe chaque objet en ACL privée, sans le supprimer ni le modifier.
 * Il tourne en arrière-plan après le démarrage et peut être relancé sans effet de bord.
 */
@Injectable()
export class LegacyPublicObjectsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(LegacyPublicObjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.LEGACY_PUBLIC_OBJECTS_MIGRATION === 'off') return;
    const timer = setTimeout(() => {
      void this.run().catch((error: unknown) =>
        this.logger.warn(`LEGACY_PUBLIC_OBJECTS_FAILED ${error instanceof Error ? error.message : 'unknown'}`),
      );
    }, 60_000);
    timer.unref?.();
  }

  async run(): Promise<{ candidates: number; privatized: number; failed: number }> {
    const keys = new Set<string>();

    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { exportedPdfFr: { startsWith: 'https://' } },
          { exportedPdfEn: { startsWith: 'https://' } },
          { officialPdfFr: { startsWith: 'https://' } },
          { officialPdfEn: { startsWith: 'https://' } },
        ],
      },
      select: { exportedPdfFr: true, exportedPdfEn: true, officialPdfFr: true, officialPdfEn: true },
    });
    for (const project of projects) {
      for (const reference of [project.exportedPdfFr, project.exportedPdfEn, project.officialPdfFr, project.officialPdfEn]) {
        const key = this.storage.historicalPublicStorageKey(reference);
        if (key) keys.add(key);
      }
    }

    const files = await this.prisma.projectFile.findMany({
      where: { url: { startsWith: 'https://' } },
      select: { id: true, url: true, storageKey: true },
    });
    const fileKeys = new Map<string, string[]>();
    for (const file of files) {
      const key = this.storage.historicalPublicStorageKey(file.url) ?? file.storageKey;
      if (!key || key.includes('..') || key.startsWith('/')) continue;
      keys.add(key);
      fileKeys.set(key, [...(fileKeys.get(key) ?? []), file.id]);
    }

    let privatized = 0;
    let failed = 0;
    for (const key of keys) {
      try {
        await this.storage.makeObjectPrivate(key);
        privatized += 1;
        const ids = fileKeys.get(key);
        // Le lien public n'est plus valide : la référence rejoint celle des fichiers privés.
        if (ids?.length) {
          await this.prisma.projectFile.updateMany({ where: { id: { in: ids } }, data: { url: 'private:project-file' } });
        }
      } catch {
        failed += 1;
      }
    }
    this.logger.log(`LEGACY_PUBLIC_OBJECTS candidates=${keys.size} privatized=${privatized} failed=${failed}`);
    return { candidates: keys.size, privatized, failed };
  }
}
