import {
  Body,
  Controller,
  Post,
  ServiceUnavailableException,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ChatNotifyDto,
  PublicAssistantMessageDto,
} from './chat.dto';
import { WebAICommercialRequestDto } from './web-ai-commercial.dto';
import { WebAICommercialService } from './web-ai-commercial.service';
import { ChatService } from './chat.service';
import { PublicAssistantConfig } from './public-assistant.config';
import { PublicAssistantOrchestratorService } from './public-assistant-orchestrator.service';

@Controller('chat')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly publicAssistant: PublicAssistantOrchestratorService,
    private readonly publicAssistantConfig: PublicAssistantConfig,
    private readonly commercial: WebAICommercialService,
  ) {}

  @Post('v1/commercial-requests')
  @Throttle({ short: { ttl: 60_000, limit: 3 }, long: { ttl: 3_600_000, limit: 10 } })
  commercialRequest(@Body() body: WebAICommercialRequestDto) {
    return this.commercial.submit(body);
  }

  @Post('v1/public-assistant')
  @Throttle({
    short: { ttl: 60_000, limit: 8 },
    long: { ttl: 3_600_000, limit: 60 },
  })
  publicAssistantChat(@Body() body: PublicAssistantMessageDto) {
    if (!this.publicAssistantConfig.enabled) {
      throw new ServiceUnavailableException(
        'WEB_AI_INTELLIGENT_ASSISTANT_DISABLED',
      );
    }
    return this.publicAssistant.answer({
      message: body.message,
      language: body.language,
      sessionId: body.sessionId,
      pagePath: body.pageContext?.pathname,
    });
  }

  @Post('notify')
  @Throttle({
    short: { ttl: 60_000, limit: 3 },
    long: { ttl: 3_600_000, limit: 10 },
  })
  notify(@Body() body: ChatNotifyDto) {
    return this.chatService.notifyAgent(
      body.email,
      body.summary,
      body.requestId,
    );
  }
}
