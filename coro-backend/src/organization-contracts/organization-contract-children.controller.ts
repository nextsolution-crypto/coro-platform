import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import {
  AdjustmentDto,
  CommitmentDto,
  ContractDocumentDto,
  ExclusivityDto,
} from './organization-contract-children.dto';
import { OrganizationContractsService } from './organization-contracts.service';
type Req = { user: { userId: string } };
@Controller('admin/v1/organizations/:organizationId/contracts')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class OrganizationContractChildrenController {
  constructor(private readonly service: OrganizationContractsService) {}
  @Get(':contractId/revisions/:revisionId/adjustments') adjustments(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
  ) {
    return this.service.listAdjustments(o, c, v);
  }
  @Post(':contractId/revisions/:revisionId/adjustments') createAdjustment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: AdjustmentDto,
    @Request() r: Req,
  ) {
    return this.service.createAdjustment(o, c, v, d, r.user);
  }
  @Patch(':contractId/revisions/:revisionId/adjustments/:id') updateAdjustment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Param('id') id: string,
    @Body() d: AdjustmentDto,
    @Request() r: Req,
  ) {
    return this.service.updateAdjustment(o, c, v, id, d, r.user);
  }
  @Delete(':contractId/revisions/:revisionId/adjustments/:id') removeAdjustment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Param('id') id: string,
    @Request() r: Req,
  ) {
    return this.service.removeAdjustment(o, c, v, id, r.user);
  }
  @Get(':contractId/revisions/:revisionId/exclusivities') exclusivities(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
  ) {
    return this.service.listExclusivities(o, c, v);
  }
  @Post(':contractId/revisions/:revisionId/exclusivities') createExclusivity(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: ExclusivityDto,
    @Request() r: Req,
  ) {
    return this.service.createExclusivity(o, c, v, d, r.user);
  }
  @Patch(':contractId/revisions/:revisionId/exclusivities/:id')
  updateExclusivity(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Param('id') id: string,
    @Body() d: ExclusivityDto,
    @Request() r: Req,
  ) {
    return this.service.updateExclusivity(o, c, v, id, d, r.user);
  }
  @Delete(':contractId/revisions/:revisionId/exclusivities/:id')
  removeExclusivity(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Param('id') id: string,
    @Request() r: Req,
  ) {
    return this.service.removeExclusivity(o, c, v, id, r.user);
  }
  @Get(':contractId/revisions/:revisionId/commitments') commitments(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
  ) {
    return this.service.listCommitments(o, c, v);
  }
  @Post(':contractId/revisions/:revisionId/commitments') createCommitment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: CommitmentDto,
    @Request() r: Req,
  ) {
    return this.service.createCommitment(o, c, v, d, r.user);
  }
  @Patch(':contractId/revisions/:revisionId/commitments/:id') updateCommitment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Param('id') id: string,
    @Body() d: CommitmentDto,
    @Request() r: Req,
  ) {
    return this.service.updateCommitment(o, c, v, id, d, r.user);
  }
  @Delete(':contractId/revisions/:revisionId/commitments/:id') removeCommitment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Param('id') id: string,
    @Request() r: Req,
  ) {
    return this.service.removeCommitment(o, c, v, id, r.user);
  }
  @Get(':contractId/documents') documents(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
  ) {
    return this.service.listDocuments(o, c);
  }
  @Post(':contractId/documents')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: ContractDocumentDto,
    @UploadedFile() f: Express.Multer.File,
    @Request() r: Req,
  ) {
    return this.service.uploadDocument(o, c, d, f, r.user);
  }
  @Get(':contractId/documents/:id/download') async download(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('id') id: string,
  ) {
    const x = await this.service.downloadDocument(o, c, id);
    return new StreamableFile(x.buffer, {
      type: x.mimeType,
      disposition: `attachment; filename="${x.fileName.replace(/["\r\n]/g, '_')}"`,
    });
  }
}
