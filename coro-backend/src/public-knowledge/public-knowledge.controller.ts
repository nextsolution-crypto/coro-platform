import {
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicKnowledgeConfig } from './public-knowledge.config';
import { PublicKnowledgeQueryDto } from './public-knowledge.dto';
import { PublicKnowledgeSearchService } from './public-knowledge-search.service';

@Controller('public-knowledge/v1')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class PublicKnowledgeController {
  constructor(
    private readonly config: PublicKnowledgeConfig,
    private readonly search: PublicKnowledgeSearchService,
  ) {}

  @Post('search')
  @Throttle({
    short: { ttl: 60_000, limit: 8 },
    long: { ttl: 3_600_000, limit: 60 },
  })
  query(@Body() body: PublicKnowledgeQueryDto) {
    if (!this.config.enabled)
      throw new ServiceUnavailableException('PUBLIC_KNOWLEDGE_DISABLED');
    return this.search.answerContext(body.question, body.language, body.limit);
  }
}
