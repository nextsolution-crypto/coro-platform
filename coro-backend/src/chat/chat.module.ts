import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { CHAT_HTTP_CLIENT, ChatService } from './chat.service';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    { provide: CHAT_HTTP_CLIENT, useValue: globalThis.fetch.bind(globalThis) },
  ],
})
export class ChatModule {}
