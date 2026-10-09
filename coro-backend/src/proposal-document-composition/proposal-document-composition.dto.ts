import { ProposalDocumentTemplateCode, ProposalLanguage } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class ComposeProposalDocumentDto {
  @IsEnum(ProposalDocumentTemplateCode)
  templateCode!: ProposalDocumentTemplateCode;

  @IsEnum(ProposalLanguage)
  language!: ProposalLanguage;

  @IsOptional()
  @IsObject()
  clauseParameters?: Record<string, unknown>;
}

export class GenerateGovernedProposalPdfDto {
  @IsString()
  @Length(1, 200)
  idempotencyKey!: string;
}
