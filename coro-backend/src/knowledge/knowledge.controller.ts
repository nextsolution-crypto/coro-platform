import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { CoroAiService } from './coro-ai.service';
import { KnowledgeIngestionService } from './knowledge-ingestion.service';
import { KnowledgeRetrievalService } from './knowledge-retrieval.service';
import { KnowledgeActor } from './knowledge.types';

type AskBody = {
  question: string;
  buildingId?: string;
  operationalContext?:
    | 'INCIDENT'
    | 'SENTINELLE'
    | 'NETWORK'
    | 'EXERCISE_REPORT'
    | 'CORRECTIVE_ACTION';
  operationalResourceId?: string;
  correlationId?: string;
};

function internalActor(req: any): KnowledgeActor {
  return {
    type: 'INTERNAL_USER',
    id: req.user.userId,
    organizationId: req.user.organizationId,
    role: req.user.role,
  };
}

function clientActor(req: any): KnowledgeActor {
  return {
    type: 'CLIENT_USER',
    id: req.clientUser.sub,
    organizationId: req.clientUser.organizationId,
    role: req.clientUser.role,
    buildingIds: req.clientUser.buildingIds ?? [],
  };
}

@Controller('knowledge')
@UseGuards(AuthGuard('jwt'))
export class KnowledgeInternalController {
  constructor(
    private readonly ingestion: KnowledgeIngestionService,
    private readonly retrieval: KnowledgeRetrievalService,
    private readonly ai: CoroAiService,
  ) {}

  @Post('project-files/:id/index')
  index(@Req() req: any, @Param('id') id: string) {
    return this.ingestion.index(internalActor(req), id);
  }

  @Get('search')
  search(
    @Req() req: any,
    @Query('q') question: string,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.retrieval.search(internalActor(req), question, buildingId);
  }

  @Post('ask')
  ask(@Req() req: any, @Body() body: AskBody) {
    return this.ai.ask(internalActor(req), body);
  }
}

@Controller('client-portal/knowledge')
@UseGuards(ClientJwtGuard)
export class KnowledgeClientController {
  constructor(
    private readonly retrieval: KnowledgeRetrievalService,
    private readonly ai: CoroAiService,
  ) {}

  @Get('search')
  search(
    @Req() req: any,
    @Query('q') question: string,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.retrieval.search(clientActor(req), question, buildingId);
  }

  @Post('ask')
  ask(@Req() req: any, @Body() body: AskBody) {
    return this.ai.ask(clientActor(req), body);
  }
}
