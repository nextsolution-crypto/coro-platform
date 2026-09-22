import { IsUUID } from 'class-validator';

export class CreateCorrectiveActionTrackingReportDto {
  @IsUUID()
  clientIntentId!: string;
}
