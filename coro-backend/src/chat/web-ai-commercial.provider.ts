import { Injectable } from '@nestjs/common';

export interface WebAICommercialProviderInput {
  requestId: string;
  requestType: string;
  language: string;
}

export interface WebAICommercialProviderResult { accepted: boolean; correlationId?: string; errorCode?: string }

export abstract class WebAICommercialProvider {
  abstract submit(input: WebAICommercialProviderInput): Promise<WebAICommercialProviderResult>;
}

@Injectable()
export class SimulatedWebAICommercialProvider extends WebAICommercialProvider {
  async submit(input: WebAICommercialProviderInput): Promise<WebAICommercialProviderResult> {
    if (process.env.WEB_AI_COMMERCIAL_SIMULATED_FAILURE === 'true')
      return { accepted: false, errorCode: 'SIMULATED_PROVIDER_FAILURE' };
    return { accepted: true, correlationId: `simulated:${input.requestId}` };
  }
}
