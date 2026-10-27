import {
  Body,
  Controller,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatMessageDto, ChatNotifyDto } from './chat.dto';
import { ChatService } from './chat.service';

@Controller('chat')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('vitrine')
  @Throttle({
    short: { ttl: 60_000, limit: 8 },
    long: { ttl: 3_600_000, limit: 60 },
  })
  chat(@Body() body: ChatMessageDto) {
    return this.chatService.handleMessage(body.message, body.history ?? []);
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
