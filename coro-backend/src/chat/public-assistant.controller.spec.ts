import { ServiceUnavailableException } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PublicAssistantConfig } from './public-assistant.config';
import { PublicAssistantOrchestratorService } from './public-assistant-orchestrator.service';
import { WebAICommercialService } from './web-ai-commercial.service';

describe('ChatController public assistant boundary', () => {
  const previousEnabled = process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED;

  afterEach(() => {
    if (previousEnabled === undefined)
      delete process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED;
    else process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED = previousEnabled;
  });

  function controller(enabled: boolean) {
    process.env.WEB_AI_INTELLIGENT_ASSISTANT_ENABLED = String(enabled);
    const answer = jest.fn().mockResolvedValue({ status: 'SUPPORTED' });
    const instance = new ChatController(
      {} as ChatService,
      { answer } as unknown as PublicAssistantOrchestratorService,
      new PublicAssistantConfig(),
      {} as WebAICommercialService,
    );
    return { instance, answer };
  }

  it('fails closed while the intelligent assistant flag is disabled', () => {
    const { instance, answer } = controller(false);

    expect(() =>
      instance.publicAssistantChat({
        message: 'What is CORO?',
        language: 'en-CA',
      }),
    ).toThrow(ServiceUnavailableException);
    expect(answer).not.toHaveBeenCalled();
  });

  it('passes only the validated public request fields to the orchestrator', async () => {
    const { instance, answer } = controller(true);

    await instance.publicAssistantChat({
      message: 'What is CORO?',
      language: 'en-CA',
      sessionId: '0a193e0d-46ab-45e0-9e58-d9821f1ed9a4',
      pageContext: { pathname: '/coro-ai' },
    });

    expect(answer).toHaveBeenCalledWith({
      message: 'What is CORO?',
      language: 'en-CA',
      sessionId: '0a193e0d-46ab-45e0-9e58-d9821f1ed9a4',
      pagePath: '/coro-ai',
    });
  });
});
