import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CapabilityCode } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { CommercialCatalogService } from './commercial-catalog.service';
import {
  CreateComponentDto,
  CreatePriceBookDto,
  CreateTierDto,
  CreateVersionDto,
  PublishVersionDto,
  ReasonDto,
  UpdateCapabilityDto,
  UpdateCommercialIdentityDto,
  UpdateComponentDto,
  UpdatePriceBookDto,
  UpdateScopeDto,
  UpdateTierDto,
  UpdateVersionDto,
} from './commercial-catalog.dto';

type AuthenticatedRequest = { user: { userId: string } };

@Controller('admin/v1')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialCatalogController {
  constructor(private readonly service: CommercialCatalogService) {}
  @Get('commercial/capabilities') capabilities() {
    return this.service.listCapabilities();
  }
  @Patch('commercial/capabilities/:code') updateCapability(
    @Param('code') code: CapabilityCode,
    @Body() dto: UpdateCapabilityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateCapability(code, dto, req.user);
  }
  @Put('commercial/capabilities/:code/scope-policy') updateScope(
    @Param('code') code: CapabilityCode,
    @Body() dto: UpdateScopeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateScope(code, dto, req.user);
  }
  @Get('organizations/:organizationId/commercial-identity') identity(
    @Param('organizationId') id: string,
  ) {
    return this.service.commercialIdentity(id);
  }
  @Patch('organizations/:organizationId/commercial-identity') updateIdentity(
    @Param('organizationId') id: string,
    @Body() dto: UpdateCommercialIdentityDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateCommercialIdentity(id, dto, req.user);
  }
  @Get('commercial/price-books') priceBooks() {
    return this.service.listPriceBooks();
  }
  @Post('commercial/price-books') createPriceBook(
    @Body() dto: CreatePriceBookDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createPriceBook(dto, req.user);
  }
  @Get('commercial/price-books/:id') priceBook(@Param('id') id: string) {
    return this.service.getPriceBook(id);
  }
  @Patch('commercial/price-books/:id') updatePriceBook(
    @Param('id') id: string,
    @Body() dto: UpdatePriceBookDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updatePriceBook(id, dto, req.user);
  }
  @Post('commercial/price-books/:id/archive') archivePriceBook(
    @Param('id') id: string,
    @Body() dto: ReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.archivePriceBook(id, dto.reason, req.user);
  }
  @Post('commercial/price-books/:bookId/versions') createVersion(
    @Param('bookId') id: string,
    @Body() dto: CreateVersionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createVersion(id, dto, req.user);
  }
  @Patch('commercial/price-books/:bookId/versions/:versionId') updateVersion(
    @Param('versionId') id: string,
    @Body() dto: UpdateVersionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateVersion(id, dto, req.user);
  }
  @Post('commercial/price-books/:bookId/versions/:versionId/publish') publish(
    @Param('versionId') id: string,
    @Body() dto: PublishVersionDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.publishVersion(id, dto, req.user);
  }
  @Post('commercial/price-books/:bookId/versions/:versionId/cancel') cancel(
    @Param('versionId') id: string,
    @Body() dto: ReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.transitionVersion(id, 'cancel', dto.reason, req.user);
  }
  @Post('commercial/price-books/:bookId/versions/:versionId/archive')
  archiveVersion(
    @Param('versionId') id: string,
    @Body() dto: ReasonDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.transitionVersion(id, 'archive', dto.reason, req.user);
  }
  @Post('commercial/price-books/:bookId/versions/:versionId/components')
  createComponent(
    @Param('versionId') id: string,
    @Body() dto: CreateComponentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createComponent(id, dto, req.user);
  }
  @Patch(
    'commercial/price-books/:bookId/versions/:versionId/components/:componentId',
  )
  updateComponent(
    @Param('versionId') versionId: string,
    @Param('componentId') id: string,
    @Body() dto: UpdateComponentDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateComponent(versionId, id, dto, req.user);
  }
  @Delete(
    'commercial/price-books/:bookId/versions/:versionId/components/:componentId',
  )
  removeComponent(
    @Param('versionId') versionId: string,
    @Param('componentId') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.removeComponent(versionId, id, req.user);
  }
  @Post(
    'commercial/price-books/:bookId/versions/:versionId/components/:componentId/tiers',
  )
  createTier(
    @Param('versionId') versionId: string,
    @Param('componentId') componentId: string,
    @Body() dto: CreateTierDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.createTier(versionId, componentId, dto, req.user);
  }
  @Patch(
    'commercial/price-books/:bookId/versions/:versionId/components/:componentId/tiers/:tierId',
  )
  updateTier(
    @Param('versionId') versionId: string,
    @Param('componentId') componentId: string,
    @Param('tierId') tierId: string,
    @Body() dto: UpdateTierDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.updateTier(
      versionId,
      componentId,
      tierId,
      dto,
      req.user,
    );
  }
  @Delete(
    'commercial/price-books/:bookId/versions/:versionId/components/:componentId/tiers/:tierId',
  )
  removeTier(
    @Param('versionId') versionId: string,
    @Param('componentId') componentId: string,
    @Param('tierId') tierId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.removeTier(versionId, componentId, tierId, req.user);
  }
}
