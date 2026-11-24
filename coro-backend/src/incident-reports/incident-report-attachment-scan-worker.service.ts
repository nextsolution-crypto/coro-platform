import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';
import { incidentReportClamavOnDemand } from './incident-reports.config';

const BATCH = 10;
const GIVE_UP_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * Analyse des pièces jointes en quarantaine (mode ClamAV à la demande).
 * Tant que ClamAV ne répond pas, rien ne se passe : le minuteur du serveur
 * le démarre quand des fichiers attendent, et l'arrête une fois la file vide.
 */
@Injectable()
export class IncidentReportAttachmentScanWorker {
  private readonly logger = new Logger(IncidentReportAttachmentScanWorker.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly scanner: IncidentReportAttachmentScanner,
  ) {}

  @Interval(20_000)
  async tick() {
    if (!incidentReportClamavOnDemand() || this.running) return;
    this.running = true;
    try {
      await this.processPending();
      await this.processProjectFiles();
      await this.processSupportAttachments();
    } catch (error) {
      this.logger.warn(`Analyse en attente : ${error instanceof Error ? error.message : 'erreur'}`);
    } finally {
      this.running = false;
    }
  }

  async processPending(now = new Date()) {
    const pending = await this.prisma.incidentReportAttachment.findMany({
      where: { scanStatus: 'PENDING', revokedAt: null },
      select: { id: true, organizationId: true, reportId: true, storageKey: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    });
    if (!pending.length) return { scanned: 0 };
    const stale = pending.filter((row) => now.getTime() - row.createdAt.getTime() > GIVE_UP_AFTER_MS);
    for (const row of stale) await this.settle(row, 'FAILED', now);
    const fresh = pending.filter((row) => !stale.includes(row));
    if (!fresh.length) return { scanned: 0 };
    try {
      await this.scanner.ping();
    } catch {
      return { scanned: 0, waiting: fresh.length };
    }
    let scanned = 0;
    for (const row of fresh) {
      let verdict: 'CLEAN' | 'INFECTED';
      try {
        const bytes = await this.storage.downloadPrivate(row.storageKey);
        verdict = await this.scanner.scan(bytes);
      } catch {
        break; // ClamAV vient de s'arrêter ou signatures pas à jour : on réessaiera
      }
      await this.settle(row, verdict, now);
      scanned += 1;
    }
    return { scanned };
  }

  /**
   * Fichiers de projet et documents de bâtiment en quarantaine (même
   * ClamAV, même minuteur). Sain : libéré. Infecté ou analyse impossible
   * pendant 48 h : bloqué (ni lisible, ni approuvable, ni indexé).
   */
  async processProjectFiles(now = new Date()) {
    const pending = await this.prisma.projectFile.findMany({
      where: { malwareScanStatus: 'PENDING' },
      select: { id: true, organizationId: true, storageKey: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    });
    if (!pending.length) return { scanned: 0 };
    const stale = pending.filter((row) => now.getTime() - row.createdAt.getTime() > GIVE_UP_AFTER_MS);
    for (const row of stale) await this.settleProjectFile(row, 'FAILED', now);
    const fresh = pending.filter((row) => !stale.includes(row));
    if (!fresh.length) return { scanned: 0 };
    try {
      await this.scanner.ping();
    } catch {
      return { scanned: 0, waiting: fresh.length };
    }
    let scanned = 0;
    for (const row of fresh) {
      let verdict: 'CLEAN' | 'INFECTED';
      try {
        verdict = await this.scanner.scan(await this.storage.downloadPrivate(row.storageKey));
      } catch {
        break;
      }
      await this.settleProjectFile(row, verdict, now);
      scanned += 1;
    }
    return { scanned };
  }

  /** Pièces jointes du Centre d'aide en quarantaine : même règle que les fichiers de projet. */
  async processSupportAttachments(now = new Date()) {
    const pending = await this.prisma.supportTicketAttachment.findMany({
      where: { malwareScanStatus: 'PENDING' },
      select: { id: true, storageKey: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: BATCH,
    });
    if (!pending.length) return { scanned: 0 };
    const settle = (id: string, verdict: 'CLEAN' | 'INFECTED' | 'FAILED') =>
      this.prisma.supportTicketAttachment.updateMany({
        where: { id, malwareScanStatus: 'PENDING' },
        data: { malwareScanStatus: verdict, malwareScannedAt: now },
      });
    const stale = pending.filter((row) => now.getTime() - row.createdAt.getTime() > GIVE_UP_AFTER_MS);
    for (const row of stale) await settle(row.id, 'FAILED');
    const fresh = pending.filter((row) => !stale.includes(row));
    if (!fresh.length) return { scanned: 0 };
    try {
      await this.scanner.ping();
    } catch {
      return { scanned: 0, waiting: fresh.length };
    }
    let scanned = 0;
    for (const row of fresh) {
      let verdict: 'CLEAN' | 'INFECTED';
      try {
        verdict = await this.scanner.scan(await this.storage.downloadPrivate(row.storageKey));
      } catch {
        break;
      }
      await settle(row.id, verdict);
      if (verdict === 'INFECTED') this.logger.warn(`Pièce jointe de support ${row.id} bloquée (logiciel malveillant).`);
      scanned += 1;
    }
    return { scanned };
  }

  private async settleProjectFile(
    row: { id: string; organizationId: string },
    verdict: 'CLEAN' | 'INFECTED' | 'FAILED',
    now: Date,
  ) {
    const updated = await this.prisma.projectFile.updateMany({
      where: { id: row.id, malwareScanStatus: 'PENDING' },
      data: { malwareScanStatus: verdict, malwareScannedAt: now },
    });
    if (updated.count === 1 && verdict !== 'CLEAN')
      this.logger.warn(
        `Fichier de projet ${row.id} bloqué (${verdict === 'INFECTED' ? 'logiciel malveillant' : 'analyse impossible'}).`,
      );
  }

  private async settle(
    row: { id: string; organizationId: string; reportId: string },
    verdict: 'CLEAN' | 'INFECTED' | 'FAILED',
    now: Date,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.incidentReportAttachment.updateMany({
        where: { id: row.id, scanStatus: 'PENDING' },
        data: {
          scanStatus: verdict,
          scannedAt: now,
          ...(verdict === 'CLEAN' ? {} : { revokedAt: now }),
        },
      });
      if (updated.count !== 1) return;
      await tx.incidentReportAuditEvent.create({
        data: {
          organizationId: row.organizationId,
          reportId: row.reportId,
          action:
            verdict === 'CLEAN'
              ? 'ATTACHMENT_SCAN_CLEAN'
              : verdict === 'INFECTED'
                ? 'ATTACHMENT_REJECTED_MALWARE'
                : 'ATTACHMENT_SCAN_FAILED',
          actorType: 'SYSTEM',
          actorId: 'CLAMAV_ON_DEMAND',
          idempotencyKey: `attachment-scan:${row.id}`,
          metadata: { attachmentId: row.id, verdict },
        },
      });
    });
  }
}
