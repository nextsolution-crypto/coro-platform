import { IsString, MinLength } from 'class-validator';

export class UnsubscribePopulationSubscriberDto {
  @IsString()
  @MinLength(20)
  accessToken: string;
}