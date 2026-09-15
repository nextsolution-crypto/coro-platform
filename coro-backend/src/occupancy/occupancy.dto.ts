import { IsIn, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsString() buildingId: string;
  @IsIn(['EMPLOYE', 'VISITEUR', 'CONTRACTEUR']) type: 'EMPLOYE' | 'VISITEUR' | 'CONTRACTEUR';
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() @IsOptional() company?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() reason?: string;
  @IsString() @IsOptional() hostName?: string;
  @IsString() @IsOptional() floor?: string;
  @IsString() kioskToken: string;
}

export class CheckOutDto {
  @IsString() recordId: string;
  @IsString() kioskToken: string;
}

export class TriggerEvacuationDto {
  @IsString() buildingId: string;
  @IsString() @IsOptional() triggeredBy?: string;
  @IsString() @IsOptional() notes?: string;
}

export class AccountForOccupantDto {
  @IsString() evacuationEventId: string;
  @IsString() occupantRecordId: string;
  @IsString() @IsOptional() checkedBy?: string;
}