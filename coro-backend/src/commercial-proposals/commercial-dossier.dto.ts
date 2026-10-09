import { IsEnum, IsUUID } from 'class-validator';

export enum CommercialDossierTargetType {
  PROSPECT = 'PROSPECT',
  ORGANIZATION = 'ORGANIZATION',
}

export class CommercialDossierParamsDto {
  @IsEnum(CommercialDossierTargetType)
  targetType!: CommercialDossierTargetType;

  @IsUUID()
  targetId!: string;
}
