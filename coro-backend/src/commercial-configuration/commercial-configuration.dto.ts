import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class GovernedReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason!: string;
}
export class GovernedPublishDto extends GovernedReasonDto {
  @IsISO8601() effectiveFrom!: string;
}
