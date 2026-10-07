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
import { PlatformRolesGuard } from '../auth/platform-roles.guard';
import { SuperAdminOnly } from '../auth/platform-roles.decorator';
import {
  CommercialContentReasonDto,
  UpdateCommercialContentVersionDto,
} from './commercial-content.dto';
import { CommercialContentService } from './commercial-content.service';

type RequestWithUser = { user: { userId: string } };

@Controller('admin/v1/commercial/content')
@UseGuards(AuthGuard('jwt'), PlatformRolesGuard)
@SuperAdminOnly()
export class CommercialContentController {
  constructor(private readonly service: CommercialContentService) {}
  @Get() list() {
    return this.service.list();
  }
  @Get(':code') detail(@Param('code') code: string) {
    return this.service.detail(code);
  }
  @Post('professional-draft') bootstrap(@Request() request: RequestWithUser) {
    return this.service.createProfessionalDraft(request.user);
  }
  @Patch('versions/:id') update(
    @Param('id') id: string,
    @Body() dto: UpdateCommercialContentVersionDto,
    @Request() request: RequestWithUser,
  ) {
    return this.service.updateDraft(id, dto, request.user);
  }
  @Post(':code/revisions') revise(
    @Param('code') code: string,
    @Request() request: RequestWithUser,
  ) {
    return this.service.createRevision(code, request.user);
  }
  @Post('versions/:id/submit-review') submit(
    @Param('id') id: string,
    @Body() dto: CommercialContentReasonDto,
    @Request() request: RequestWithUser,
  ) {
    return this.service.submit(id, dto, request.user);
  }
  @Post('versions/:id/return-to-draft') returnToDraft(
    @Param('id') id: string,
    @Body() dto: CommercialContentReasonDto,
    @Request() request: RequestWithUser,
  ) {
    return this.service.returnToDraft(id, dto, request.user);
  }
  @Post('versions/:id/approve') approve(
    @Param('id') id: string,
    @Body() dto: CommercialContentReasonDto,
    @Request() request: RequestWithUser,
  ) {
    return this.service.approve(id, dto, request.user);
  }
  @Post('versions/:id/archive') archive(
    @Param('id') id: string,
    @Body() dto: CommercialContentReasonDto,
    @Request() request: RequestWithUser,
  ) {
    return this.service.archive(id, dto, request.user);
  }
}
