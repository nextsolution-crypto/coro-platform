import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WebAICommercialRequestDto } from './web-ai-commercial.dto';
import { WebAICommercialProvider } from './web-ai-commercial.provider';

@Injectable()
export class WebAICommercialService {
  constructor(private readonly prisma: PrismaService, private readonly provider: WebAICommercialProvider) {}

  async submit(dto: WebAICommercialRequestDto) {
    if (process.env.WEB_AI_COMMERCIAL_INTAKE_ENABLED !== 'true')
      throw new ServiceUnavailableException('WEB_AI_COMMERCIAL_INTAKE_DISABLED');
    if (process.env.WEB_AI_COMMERCIAL_PROVIDER !== 'simulated')
      throw new ServiceUnavailableException('WEB_AI_COMMERCIAL_PROVIDER_NOT_AUTHORIZED');
    if (!dto.consentToProcess)
      throw new BadRequestException('COMMERCIAL_PROCESSING_CONSENT_REQUIRED');

    const payloadFingerprint = this.fingerprint(dto);
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.idempotencyKey}, 0))`;
      const existing = await tx.webAICommercialRequest.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (existing && existing.payloadFingerprint !== payloadFingerprint)
        throw new BadRequestException('IDEMPOTENCY_KEY_PAYLOAD_MISMATCH');
      if (existing?.status === 'PROCESSED') return { request: existing, replayed: true, failed: false };
      const request = existing ?? await tx.webAICommercialRequest.create({
        data: {
          ...dto,
          payloadFingerprint,
          preferredLanguage: dto.preferredLanguage === 'fr-CA' ? 'FR_CA' : 'EN_CA',
          email: dto.email.toLowerCase(),
          interestedModules: [...new Set(dto.interestedModules.map((value) => value.trim()).filter(Boolean))],
          consentTextVersion: 'web-ai-commercial-v1',
          consentAction: 'CHECKBOX_AND_SUBMIT',
          consentTimestamp: new Date(),
          providerMode: 'SIMULATED',
          status: 'SUBMITTED',
        },
      });
      const provider = await this.provider.submit({ requestId: request.id, requestType: request.requestType, language: request.preferredLanguage });
      if (!provider.accepted) {
        const failed = await tx.webAICommercialRequest.update({ where: { id: request.id }, data: { status: 'FAILED', failureCode: provider.errorCode ?? 'PROVIDER_REJECTED' } });
        return { request: failed, replayed: Boolean(existing), failed: true };
      }
      const prospect = request.prospectId ? { id: request.prospectId } : await tx.commercialProspect.create({
        data: {
          reference: `WEB-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`,
          legalName: dto.organizationName,
          displayName: dto.organizationName,
          preferredLanguage: dto.preferredLanguage === 'fr-CA' ? 'FR' : 'EN',
          contactName: dto.contactName,
          contactTitle: dto.contactTitle,
          contactEmail: dto.email.toLowerCase(),
          country: 'CA',
          createdByDisplayName: 'CORO AI Web public intake',
        },
      });
      const completed = await tx.webAICommercialRequest.update({ where: { id: request.id }, data: { prospectId: prospect.id, status: 'PROCESSED', failureCode: null, providerCorrelationId: provider.correlationId } });
      return { request: completed, replayed: Boolean(existing), failed: false };
    });
    if (outcome.failed) throw new ServiceUnavailableException('COMMERCIAL_REQUEST_NOT_SUBMITTED');
    return this.response(outcome.request, outcome.replayed);
  }

  private response(request: { id: string; status: string; idempotencyKey: string }, replayed: boolean) {
    return { success: request.status === 'PROCESSED', requestId: request.id, replayed, receipt: createHash('sha256').update(`${request.id}:${request.idempotencyKey}`).digest('hex').slice(0, 24) };
  }

  private fingerprint(dto: WebAICommercialRequestDto): string {
    const canonical = { ...dto, email: dto.email.toLowerCase(), interestedModules: [...dto.interestedModules].map((value) => value.trim()).filter(Boolean).sort() };
    return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
  }
}
