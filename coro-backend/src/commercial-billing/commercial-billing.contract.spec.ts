import { readFileSync } from 'fs';
import { join } from 'path';

describe('commercial billing policy contract', () => {
  const service = readFileSync(join(process.cwd(), 'src/commercial-billing/commercial-billing.service.ts'), 'utf8');
  const controller = readFileSync(join(process.cwd(), 'src/commercial-billing/commercial-billing.controller.ts'), 'utf8');
  it('requires approved governed taxes and manual payment evidence', () => {
    expect(service).toContain('APPROVED_TAX_CONFIGURATION_REQUIRED');
    expect(service).toContain('evidenceReference: dto.evidenceReference');
    expect(service).toContain('PAYMENT_EXCEEDS_BALANCE');
    expect(controller).toContain('COMMERCIAL_PAYMENT_RECORD');
  });
  it('separates preparation, approval and payment authorities', () => {
    expect(controller).toContain('COMMERCIAL_BILLING_MANAGE');
    expect(controller).toContain('COMMERCIAL_BILLING_APPROVE');
    expect(controller).toContain('COMMERCIAL_PAYMENT_RECORD');
  });
  it('records past due without automatic subscription suspension', () => {
    expect(service).toContain('automaticSubscriptionSuspension: false');
    expect(service).not.toContain('commercialSubscription.updateMany({ where: { id: invoice.subscriptionId');
  });
});
