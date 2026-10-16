import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GrantBookingEligibilityDto {
  @IsUUID()
  advisorUserId!: string;

  @IsOptional()
  @IsUUID()
  activityId?: string;

  @IsInt()
  @Min(0)
  @Max(10_000)
  priority!: number;
}
