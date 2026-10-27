import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ChatHistoryMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  content!: string;
}

export class ChatMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2_000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  message!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryMessageDto)
  history: ChatHistoryMessageDto[] = [];
}

export class PublicAssistantPageContextDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  pathname!: string;
}

export class PublicAssistantMessageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2_000)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  message!: string;

  @IsIn(['fr-CA', 'en-CA'])
  language!: 'fr-CA' | 'en-CA';

  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublicAssistantPageContextDto)
  pageContext?: PublicAssistantPageContextDto;
}

export class ChatNotifyDto {
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1_500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  summary!: string;

  @Equals(true)
  consent!: true;

  @IsUUID('4')
  requestId!: string;
}
