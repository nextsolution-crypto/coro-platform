import { Body, Controller, Headers, HttpCode, Post } from '@nestjs/common';
import { PopulationBrevoSmsWebhookService } from './population-brevo-sms-webhook.service';

@Controller('webhooks/brevo/population/sms')
export class PopulationBrevoSmsWebhookController {
  constructor(private readonly webhook: PopulationBrevoSmsWebhookService) {}

  @Post()
  @HttpCode(200)
  receive(
    @Headers('authorization') authorization: string | undefined,
    @Body() payload: unknown,
  ) {
    return this.webhook.receive(authorization, payload);
  }
}
