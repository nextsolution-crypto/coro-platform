import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { CommercialProposalsService } from './commercial-proposals.service';
import { ProposalPdfService } from './proposal-pdf.service';
import {
  ConfigureRevisionDto,
  CreateContractFromProposalDto,
  CreateProposalDto,
  CreateProspectDto,
  CreateRevisionDto,
  ConvertProspectDto,
  GenerateProposalPdfDto,
  SnapshotPopulationDto,
  TransitionProposalDto,
  UpdateProposalFinalizationDto,
  ValueAnalysisDto,
} from './dto/commercial-proposals.dto';
type Req = { user: { userId: string } };

@Controller('admin/v1/commercial/proposals')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialProposalsController {
  constructor(
    private service: CommercialProposalsService,
    private pdf: ProposalPdfService,
  ) {}
  @Get() list() {
    return this.service.listProposals();
  }
  @Post() create(@Body() d: CreateProposalDto, @Request() r: Req) {
    return this.service.createProposal(d, r.user);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.proposal(id);
  }
  @Get(':id/revisions/:revisionId/customer-preview') preview(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ) {
    return this.service.customerPreview(id, revisionId);
  }
  @Put(':id/revisions/:revisionId/finalization') finalization(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Body() d: UpdateProposalFinalizationDto,
    @Request() r: Req,
  ) {
    return this.service.updateFinalization(id, revisionId, d, r.user);
  }
  @Post(':id/revisions') revision(
    @Param('id') id: string,
    @Body() d: CreateRevisionDto,
    @Request() r: Req,
  ) {
    return this.service.createRevision(id, d, r.user);
  }
  @Put(':id/revisions/:revisionId/configure') configure(
    @Param('revisionId') id: string,
    @Body() d: ConfigureRevisionDto,
    @Request() r: Req,
  ) {
    return this.service.configure(id, d, r.user);
  }
  @Put(':id/revisions/:revisionId/value-analysis') value(
    @Param('revisionId') id: string,
    @Body() d: ValueAnalysisDto,
    @Request() r: Req,
  ) {
    return this.service.setValueAnalysis(id, d, r.user);
  }
  @Post(':id/revisions/:revisionId/snapshot-population')
  snapshotPopulation(
    @Param('revisionId') id: string,
    @Body() d: SnapshotPopulationDto,
    @Request() r: Req,
  ) {
    return this.service.snapshotPopulation(id, d.facilityProfileId, r.user);
  }
  @Post(':id/revisions/:revisionId/request-review') review(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'INTERNAL_REVIEW', d, r.user);
  }
  @Post(':id/revisions/:revisionId/return-to-draft') draft(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'DRAFT', d, r.user);
  }
  @Post(':id/revisions/:revisionId/mark-ready') ready(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'READY', d, r.user);
  }
  @Post(':id/revisions/:revisionId/generate-pdf') generate(
    @Param('revisionId') id: string,
    @Body() d: GenerateProposalPdfDto,
    @Request() r: Req,
  ) {
    return this.pdf.generate(id, d.language, d.idempotencyKey, r.user);
  }
  @Get(':id/revisions/:revisionId/documents/:documentId/download')
  async download(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
    @Param('documentId') documentId: string,
  ) {
    const document = await this.pdf.download(id, revisionId, documentId);
    return new StreamableFile(document.buffer, {
      type: document.mimeType,
      disposition: `attachment; filename="${document.fileName.replace(/["\r\n]/g, '_')}"`,
    });
  }
  @Post(':id/revisions/:revisionId/mark-sent') sent(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'SENT', d, r.user);
  }
  @Post(':id/revisions/:revisionId/accept') accept(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'ACCEPTED', d, r.user);
  }
  @Post(':id/revisions/:revisionId/reject') reject(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'REJECTED', d, r.user);
  }
  @Post(':id/revisions/:revisionId/cancel') cancel(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'CANCELLED', d, r.user);
  }
  @Post(':id/revisions/:revisionId/supersede') supersede(
    @Param('revisionId') id: string,
    @Body() d: TransitionProposalDto,
    @Request() r: Req,
  ) {
    return this.service.transition(id, 'SUPERSEDED', d, r.user);
  }
  @Post(':id/revisions/:revisionId/create-contract') contract(
    @Param('revisionId') id: string,
    @Body() d: CreateContractFromProposalDto,
    @Request() r: Req,
  ) {
    return this.service.createContract(id, d, r.user);
  }
}

@Controller('admin/v1/commercial/prospects')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialProspectsController {
  constructor(private service: CommercialProposalsService) {}
  @Get() list() {
    return this.service.listProspects();
  }
  @Post() create(@Body() d: CreateProspectDto, @Request() r: Req) {
    return this.service.createProspect(d, r.user);
  }
  @Get(':id') detail(@Param('id') id: string) {
    return this.service.prospect(id);
  }
  @Post(':id/convert-to-organization') convert(
    @Param('id') id: string,
    @Body() d: ConvertProspectDto,
    @Request() r: Req,
  ) {
    return this.service.convertProspect(id, d, r.user);
  }
}
