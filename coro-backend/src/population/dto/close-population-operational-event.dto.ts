import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ClosePopulationOperationalEventDto {
  @IsOptional()
  @IsBoolean()
  forceClose?: boolean;

  @IsOptional()
  @IsBoolean()
  confirmIncompleteDelivery?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  closeReason?: string;
}
