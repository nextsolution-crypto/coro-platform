import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('vitrine')
  async chat(@Body() body: { message: string; history?: { role: string; content: string }[] }) {
    return this.chatService.handleMessage(body.message, body.history || []);
  }
}