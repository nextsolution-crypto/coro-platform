import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CoroActorType, PopulationEvidenceReportStatus, PopulationEvidenceStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { verifyEvidenceIntegrity } from './population-evidence.service';
import { POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION, PopulationEvidenceReportRenderer } from './population-evidence-report.renderer';

const LEASE_MS = 2 * 60 * 1000;
const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

@Injectable()
export class PopulationEvidenceReportService {
  private readonly renderer = new PopulationEvidenceReportRenderer();
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

  private publicRecord(record: any) {
    return {
      id: record.id, version: record.version, format: record.format, language: record.language,
      status: record.status, generatedAt: record.generatedAt, generatedByType: record.generatedByType,
      generatorVersion: record.generatorVersion, fileSize: record.fileSize,
      reportSha256: record.reportSha256, finalizedAt: record.finalizedAt, createdAt: record.createdAt,
    };
  }

  async get(buildingId: string, organizationId: string, evidenceId: string) {
    const report = await this.prisma.populationEvidenceReport.findFirst({ where: { buildingId, organizationId, evidenceRecordId: evidenceId, version: 1, language: 'FR', format: 'PDF' } });
    if (!report) throw new NotFoundException('Rapport PDF introuvable');
    return this.publicRecord(report);
  }

  async generate(buildingId: string, organizationId: string, evidenceId: string, actor: { type: CoroActorType; id: string }) {
    const now = new Date();
    const reservation = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'report:' + evidenceId}))`;
      const evidence = await tx.populationEvidenceRecord.findFirst({ where: { id: evidenceId, buildingId, organizationId } });
      if (!evidence) throw new NotFoundException('Dossier de preuve introuvable');
      const manifest = await tx.populationEvidenceManifest.findFirst({ where: { evidenceRecordId: evidenceId, buildingId, organizationId, version: 1 } });
      const verification = verifyEvidenceIntegrity(evidence, manifest);
      if (evidence.status !== PopulationEvidenceStatus.FINALIZED || !manifest || verification.status !== 'VERIFIED') throw new BadRequestException(`Generation PDF refusee: integrite ${verification.status}`);
      let report = await tx.populationEvidenceReport.findFirst({ where: { evidenceRecordId: evidenceId, version: 1, language: 'FR', format: 'PDF' } });
      if (report?.status === PopulationEvidenceReportStatus.FINALIZED) return { report, evidence, manifest, verification, owner: false };
      if (!report) {
        const id = randomUUID();
        report = await tx.populationEvidenceReport.create({ data: {
          id, organizationId, buildingId, programId: evidence.programId, operationalEventId: evidence.operationalEventId,
          evidenceRecordId: evidence.id, manifestId: manifest.id, version: 1, format: 'PDF', language: 'FR', status: PopulationEvidenceReportStatus.GENERATING,
          generationStartedAt: now, generationLeaseUntil: new Date(now.getTime() + LEASE_MS), generatedAt: now,
          generatedByType: actor.type, generatedById: actor.id, generatorVersion: POPULATION_EVIDENCE_REPORT_GENERATOR_VERSION,
          storageKey: `population-evidence/${organizationId}/${evidence.id}/${id}/${evidence.reference}_v1_FR.pdf`,
        } });
        return { report, evidence, manifest, verification, owner: true };
      }
      if (report.generationLeaseUntil <= now) {
        report = await tx.populationEvidenceReport.update({ where: { id: report.id }, data: { generationLeaseUntil: new Date(now.getTime() + LEASE_MS) } });
        return { report, evidence, manifest, verification, owner: true };
      }
      return { report, evidence, manifest, verification, owner: false };
    });
    if (reservation.report.status === PopulationEvidenceReportStatus.FINALIZED) return this.publicRecord(reservation.report);
    if (!reservation.owner) return this.waitForFinalized(reservation.report.id, buildingId, organizationId);
    return this.materialize(reservation);
  }

  private async materialize({ report, evidence, manifest, verification }: any) {
    if (report.reportSha256 && report.fileSize) {
      try {
        const stored = await this.storage.downloadPrivate(report.storageKey);
        if (stored.length === report.fileSize && sha256(stored) === report.reportSha256) return this.finalize(report.id, report.reportSha256, report.fileSize);
        throw new ConflictException('Objet PDF prive divergent; aucun ecrasement autorise');
      } catch (error: any) { if (error?.message !== 'PRIVATE_OBJECT_NOT_FOUND') throw error; }
    }
    const bytes = await this.renderer.render({ evidence, manifestRecord: manifest, verification, reportGeneratedAt: report.generatedAt });
    const hash = sha256(bytes);
    await this.prisma.populationEvidenceReport.update({ where: { id: report.id }, data: { reportSha256: hash, fileSize: bytes.length } });
    try { await this.storage.uploadPrivateImmutable(bytes, report.storageKey, 'application/pdf'); }
    catch (error: any) {
      if (error?.message !== 'PRIVATE_OBJECT_ALREADY_EXISTS') throw error;
      const stored = await this.storage.downloadPrivate(report.storageKey);
      if (stored.length !== bytes.length || sha256(stored) !== hash) throw new ConflictException('Objet PDF prive divergent; aucun ecrasement autorise');
    }
    return this.finalize(report.id, hash, bytes.length);
  }

  private async finalize(id: string, hash: string, size: number) {
    const report = await this.prisma.populationEvidenceReport.update({ where: { id }, data: { status: PopulationEvidenceReportStatus.FINALIZED, reportSha256: hash, fileSize: size, finalizedAt: new Date() } });
    return this.publicRecord(report);
  }

  private async waitForFinalized(id: string, buildingId: string, organizationId: string) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const report = await this.prisma.populationEvidenceReport.findFirst({ where: { id, buildingId, organizationId } });
      if (report?.status === PopulationEvidenceReportStatus.FINALIZED) return this.publicRecord(report);
      if (report && report.generationLeaseUntil <= new Date()) throw new ConflictException('Generation PDF interrompue; relancez pour reprendre');
    }
    throw new ConflictException('Generation PDF deja en cours');
  }

  async download(buildingId: string, organizationId: string, evidenceId: string) {
    const report = await this.prisma.populationEvidenceReport.findFirst({ where: { buildingId, organizationId, evidenceRecordId: evidenceId, version: 1, language: 'FR', format: 'PDF', status: PopulationEvidenceReportStatus.FINALIZED } });
    if (!report?.reportSha256 || !report.fileSize) throw new NotFoundException('Rapport PDF finalise introuvable');
    const bytes = await this.storage.downloadPrivate(report.storageKey);
    if (bytes.length !== report.fileSize || sha256(bytes) !== report.reportSha256) throw new ConflictException('Integrite du rapport PDF stocke invalide');
    const evidence = await this.prisma.populationEvidenceRecord.findFirst({ where: { id: evidenceId, buildingId, organizationId }, select: { reference: true } });
    return { bytes, filename: `${evidence!.reference}_v1.pdf` };
  }
}
