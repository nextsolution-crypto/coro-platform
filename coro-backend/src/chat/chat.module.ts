import { Module } from '@nestjs/common';
import { PublicKnowledgeModule } from '../public-knowledge/public-knowledge.module';
import { ChatController } from './chat.controller';
import {
  CHAT_HTTP_CLIENT,
  type ChatHttpClient,
  ChatService,
} from './chat.service';
import { PublicAssistantConfig } from './public-assistant.config';
import { BedrockWebPublicProvider } from './bedrock-web-public.provider';
import { DocumentaryPublicAssistantProvider } from './documentary-public-assistant.provider';
import { PublicAssistantNavigationRegistry } from './public-assistant-navigation';
import { PublicAssistantOrchestratorService } from './public-assistant-orchestrator.service';
import { PublicAssistantProviderGateway } from './public-assistant-provider.gateway';
import { PublicAssistantSessionService } from './public-assistant-session.service';
import { PublicAssistantValidator } from './public-assistant-validator';
import { SimulatedPublicAssistantProvider } from './simulated-public-assistant.provider';
import { WebAIAdminController } from './web-ai-admin.controller';
import { WebAICommercialProvider, SimulatedWebAICommercialProvider } from './web-ai-commercial.provider';
import { WebAICommercialService } from './web-ai-commercial.service';
import { WebAIObservabilityService } from './web-ai-observability.service';

// Nest's TypeScript target resolves the ambient fetch parameters as `any` even
// though the provider contract is explicitly the platform Fetch API.
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
const chatHttpClient: ChatHttpClient = (input, init) => fetch(input, init);

@Module({
  imports: [PublicKnowledgeModule],
  controllers: [ChatController, WebAIAdminController],
  providers: [
    ChatService,
    PublicAssistantConfig,
    PublicAssistantNavigationRegistry,
    PublicAssistantSessionService,
    PublicAssistantValidator,
    DocumentaryPublicAssistantProvider,
    SimulatedPublicAssistantProvider,
    BedrockWebPublicProvider,
    PublicAssistantProviderGateway,
    PublicAssistantOrchestratorService,
    WebAICommercialService,
    WebAIObservabilityService,
    { provide: WebAICommercialProvider, useClass: SimulatedWebAICommercialProvider },
    { provide: CHAT_HTTP_CLIENT, useValue: chatHttpClient },
  ],
})
export class ChatModule {}
