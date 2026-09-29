import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import {
  ContractReasonDto,
  CreateContractDto,
  CreateRevisionDto,
  SignRevisionDto,
  UpdateContractDto,
} from './organization-contracts.dto';
import { OrganizationContractsService } from './organization-contracts.service';
type Req = { user: { userId: string } };
@Controller('admin/v1/organizations/:organizationId/contracts')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class OrganizationContractsController {
  constructor(private readonly service: OrganizationContractsService) {}
  @Get() list(@Param('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }
  @Get('current') current(@Param('organizationId') organizationId: string) {
    return this.service.current(organizationId);
  }
  @Get(':contractId') get(
    @Param('organizationId') organizationId: string,
    @Param('contractId') contractId: string,
  ) {
    return this.service.get(organizationId, contractId);
  }
  @Post() create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateContractDto,
    @Request() req: Req,
  ) {
    return this.service.create(organizationId, dto, req.user);
  }
  @Patch(':contractId') update(
    @Param('organizationId') organizationId: string,
    @Param('contractId') contractId: string,
    @Body() dto: UpdateContractDto,
    @Request() req: Req,
  ) {
    return this.service.update(organizationId, contractId, dto, req.user);
  }
  @Post(':contractId/approve') approve(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.contractTransition(o, c, 'approve', d, r.user);
  }
  @Post(':contractId/activate') activate(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.contractTransition(o, c, 'activate', d, r.user);
  }
  @Post(':contractId/cancel') cancel(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.contractTransition(o, c, 'cancel', d, r.user);
  }
  @Post(':contractId/terminate') terminate(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.contractTransition(o, c, 'terminate', d, r.user);
  }
  @Post(':contractId/expire') expire(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.contractTransition(o, c, 'expire', d, r.user);
  }
  @Post(':contractId/amendments') amendment(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Body() d: CreateRevisionDto,
    @Request() r: Req,
  ) {
    return this.service.createRevision(o, c, d, r.user);
  }
  @Post(':contractId/revisions/:revisionId/approve') approveRevision(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.revisionTransition(o, c, v, 'approve', d, r.user);
  }
  @Post(':contractId/revisions/:revisionId/reopen') reopenRevision(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.revisionTransition(o, c, v, 'reopen', d, r.user);
  }
  @Post(':contractId/revisions/:revisionId/cancel') cancelRevision(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: ContractReasonDto,
    @Request() r: Req,
  ) {
    return this.service.revisionTransition(o, c, v, 'cancel', d, r.user);
  }
  @Post(':contractId/revisions/:revisionId/sign') sign(
    @Param('organizationId') o: string,
    @Param('contractId') c: string,
    @Param('revisionId') v: string,
    @Body() d: SignRevisionDto,
    @Request() r: Req,
  ) {
    return this.service.sign(o, c, v, d, r.user);
  }
}
