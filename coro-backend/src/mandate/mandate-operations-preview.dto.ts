import { IsString, Matches } from 'class-validator';

export class MandateOperationsPreviewDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) expectedRevision!: string;
}
