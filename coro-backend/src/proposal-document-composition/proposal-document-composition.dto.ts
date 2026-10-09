import { ProposalDocumentTemplateCode, ProposalLanguage } from '@prisma/client';
import { IsEnum, IsObject, IsOptional } from 'class-validator';

export class ComposeProposalDocumentDto {
  @IsEnum(ProposalDocumentTemplateCode)
  templateCode!: ProposalDocumentTemplateCode;

  @IsEnum(ProposalLanguage)
  language!: ProposalLanguage;

  @IsOptional()
  @IsObject()
  clauseParameters?: Record<string, unknown>;
}
