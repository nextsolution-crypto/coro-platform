import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { PopulationBrevoWebhookService } from './population-brevo-webhook.service';

@Controller('webhooks/brevo/population/email')
export class PopulationBrevoWebhookController {
  constructor(private readonly webhook: PopulationBrevoWebhookService) {}

  @Post()
  @HttpCode(200)
  receive(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: unknown,
  ) {
    return this.webhook.receive(authorization, payload);
  }
}
