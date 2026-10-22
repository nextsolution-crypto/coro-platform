import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformPermission } from '@prisma/client';
import { RequirePlatformPermission } from '../auth/platform-permission.decorator';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { ApproveCreditNoteDto, BillingTransitionDto, CreateCreditNoteDto, CreateInvoiceDto, CreateTaxConfigurationDto, IssueCreditNoteDto, IssueInvoiceDto, RecordPaymentDto } from './commercial-billing.dto';
import { CommercialBillingService } from './commercial-billing.service';

type Req = { user: { userId: string } };

@Controller('admin/v1/organizations/:organizationId/billing')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialBillingController {
  constructor(private readonly service: CommercialBillingService) {}

  @Get('tax-configurations')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  taxes(@Param('organizationId') o: string) { return this.service.taxConfigurations(o); }
  @Post('tax-configurations')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  createTax(@Param('organizationId') o: string, @Body() d: CreateTaxConfigurationDto, @Request() r: Req) { return this.service.createTaxConfiguration(o, d, r.user); }
  @Post('tax-configurations/:id/approve')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_APPROVE, 'organizationId')
  approveTax(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: BillingTransitionDto, @Request() r: Req) { return this.service.approveTaxConfiguration(o, id, d, r.user); }

  @Get('invoices')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  list(@Param('organizationId') o: string) { return this.service.list(o); }
  @Get('invoices/:id')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  detail(@Param('organizationId') o: string, @Param('id') id: string) { return this.service.detail(o, id); }
  @Post('invoices')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  create(@Param('organizationId') o: string, @Body() d: CreateInvoiceDto, @Request() r: Req) { return this.service.createInvoice(o, d, r.user); }
  @Post('invoices/:id/approve')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_APPROVE, 'organizationId')
  approve(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: BillingTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'approve', d, r.user); }
  @Post('invoices/:id/issue')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_APPROVE, 'organizationId')
  issue(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: IssueInvoiceDto, @Request() r: Req) { return this.service.transition(o, id, 'issue', d, r.user); }
  @Post('invoices/:id/past-due')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  pastDue(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: BillingTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'past-due', d, r.user); }
  @Post('invoices/:id/cancel')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_APPROVE, 'organizationId')
  cancel(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: BillingTransitionDto, @Request() r: Req) { return this.service.transition(o, id, 'cancel', d, r.user); }
  @Post('invoices/:id/payments')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_PAYMENT_RECORD, 'organizationId')
  payment(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: RecordPaymentDto, @Request() r: Req) { return this.service.recordPayment(o, id, d, r.user); }
  @Post('invoices/:id/credit-notes')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_MANAGE, 'organizationId')
  credit(@Param('organizationId') o: string, @Param('id') id: string, @Body() d: CreateCreditNoteDto, @Request() r: Req) { return this.service.createCreditNote(o, id, d, r.user); }
  @Post('invoices/:invoiceId/credit-notes/:id/approve')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_APPROVE, 'organizationId')
  approveCredit(@Param('organizationId') o: string, @Param('invoiceId') invoiceId: string, @Param('id') id: string, @Body() d: ApproveCreditNoteDto, @Request() r: Req) { return this.service.approveCreditNote(o, invoiceId, id, d, r.user); }
  @Post('invoices/:invoiceId/credit-notes/:id/issue')
  @RequirePlatformPermission(PlatformPermission.COMMERCIAL_BILLING_APPROVE, 'organizationId')
  issueCredit(@Param('organizationId') o: string, @Param('invoiceId') invoiceId: string, @Param('id') id: string, @Body() d: IssueCreditNoteDto, @Request() r: Req) { return this.service.issueCreditNote(o, invoiceId, id, d, r.user); }
}
