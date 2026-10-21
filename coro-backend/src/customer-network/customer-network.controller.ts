import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import {
  AddBuildingMembershipDto,
  BootstrapNetworkPortfolioDto,
  CreateNetworkAuthorityDraftDto,
  CreatePortfolioAssignmentDto,
  CreatePortfolioDto,
  CreateRegionDto,
  LinkRegionDto,
  NetworkAuthorityTransitionDto,
  PortfolioQueryDto,
  ReplaceNetworkResponsibleDto,
  SucceedPortfolioAssignmentDto,
} from './customer-network.dto';
import { CustomerNetworkService } from './customer-network.service';

type InternalRequest = { user: { userId: string } };
type ClientRequest = {
  clientUser: { sub: string; organizationId: string };
};

@Controller('admin/v1/customer-network/:organizationId')
@UseGuards(AuthGuard('jwt'))
export class CustomerNetworkAdminController {
  constructor(private readonly service: CustomerNetworkService) {}

  @Post('authority/draft')
  createDraft(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateNetworkAuthorityDraftDto,
  ) {
    return this.service.createDraft(req.user, organizationId, input);
  }

  @Post('authority/activate')
  activate(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: NetworkAuthorityTransitionDto,
  ) {
    return this.service.activate(
      req.user,
      organizationId,
      input.lockVersion,
      input.reason,
    );
  }

  @Post('authority/replace-responsible')
  replaceResponsible(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: ReplaceNetworkResponsibleDto,
  ) {
    return this.service.replaceResponsible(
      req.user,
      organizationId,
      input.responsibleUserId,
      input.lockVersion,
      input.reason,
    );
  }

  @Post('authority/revoke')
  revokeAuthority(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: NetworkAuthorityTransitionDto,
  ) {
    return this.service.revokeAuthority(
      req.user,
      organizationId,
      input.lockVersion,
      input.reason,
    );
  }

  @Post('assignments')
  createAssignment(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: CreatePortfolioAssignmentDto,
  ) {
    return this.service.createAssignment(req.user, organizationId, input);
  }

  @Post('authority/bootstrap-portfolio')
  bootstrapPortfolio(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: BootstrapNetworkPortfolioDto,
  ) {
    return this.service.bootstrapInitialPortfolio(
      req.user,
      organizationId,
      input,
    );
  }

  @Post('assignments/:id/revoke')
  revokeAssignment(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() input: NetworkAuthorityTransitionDto,
  ) {
    return this.service.revokeAssignment(
      req.user,
      organizationId,
      id,
      input.lockVersion,
      input.reason,
    );
  }

  @Post('portfolios')
  createPortfolio(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: CreatePortfolioDto,
  ) {
    return this.service.createPortfolio(req.user, organizationId, input);
  }

  @Post('regions')
  createRegion(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Body() input: CreateRegionDto,
  ) {
    return this.service.createRegion(req.user, organizationId, input);
  }

  @Post('portfolios/:portfolioId/regions')
  linkRegion(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() input: LinkRegionDto,
  ) {
    return this.service.linkRegion(
      req.user,
      organizationId,
      portfolioId,
      input,
    );
  }

  @Post('portfolios/:portfolioId/buildings')
  addBuilding(
    @Req() req: InternalRequest,
    @Param('organizationId') organizationId: string,
    @Param('portfolioId') portfolioId: string,
    @Body() input: AddBuildingMembershipDto,
  ) {
    return this.service.addBuilding(
      req.user,
      organizationId,
      portfolioId,
      input,
    );
  }
}

@Controller('client-portal/network')
@UseGuards(ClientJwtGuard)
export class CustomerNetworkClientController {
  constructor(private readonly service: CustomerNetworkService) {}

  @Get('access')
  access(@Req() req: ClientRequest) {
    return this.service.hasClientAccess(req.clientUser);
  }

  @Get('assignments')
  assignments(@Req() req: ClientRequest) {
    return this.service.listManagedAssignments(req.clientUser);
  }

  @Get('management-context')
  managementContext(@Req() req: ClientRequest) {
    return this.service.clientManagementContext(req.clientUser);
  }

  @Post('assignments')
  createAssignment(
    @Req() req: ClientRequest,
    @Body() input: CreatePortfolioAssignmentDto,
  ) {
    return this.service.createClientAssignment(req.clientUser, input);
  }

  @Post('assignments/:id/revoke')
  revokeAssignment(
    @Req() req: ClientRequest,
    @Param('id') id: string,
    @Body() input: NetworkAuthorityTransitionDto,
  ) {
    return this.service.revokeClientAssignment(
      req.clientUser,
      id,
      input.lockVersion,
      input.reason,
    );
  }

  @Post('assignments/:id/succeed')
  succeedAssignment(
    @Req() req: ClientRequest,
    @Param('id') id: string,
    @Body() input: SucceedPortfolioAssignmentDto,
  ) {
    return this.service.succeedClientAssignment(req.clientUser, id, input);
  }

  @Get('supervision')
  supervision(@Req() req: ClientRequest, @Query() query: PortfolioQueryDto) {
    return this.service.supervision(req.clientUser, query);
  }

  @Get('buildings/:buildingId')
  building(@Req() req: ClientRequest, @Param('buildingId') buildingId: string) {
    return this.service.building(req.clientUser, buildingId);
  }
}
