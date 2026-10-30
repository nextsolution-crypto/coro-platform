import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientJwtGuard } from '../client-portal/client-jwt.guard';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';
import { EvidenceReadAccess } from '../auth/organization-access.decorator';
import { BuildingDocumentsService } from './building-documents.service';
import { KnowledgeActor } from '../knowledge/knowledge.types';
import { BuildingDocumentUploadGuard } from './building-document-upload.guard';
const internal = (req: any): KnowledgeActor => ({
  type: 'INTERNAL_USER',
  id: req.user.userId,
  organizationId: req.user.organizationId,
  role: req.user.role,
});
const client = (req: any): KnowledgeActor => ({
  type: 'CLIENT_USER',
  id: req.clientUser.sub,
  organizationId: req.clientUser.organizationId,
  role: req.clientUser.role,
  buildingIds: [],
});
function stream(file: { buffer: Buffer; mimeType: string; name: string }) {
  return new StreamableFile(file.buffer, {
    type: file.mimeType,
    disposition: `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
  });
}
@Controller('buildings/:buildingId/documents')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class BuildingDocumentsController {
  constructor(private readonly service: BuildingDocumentsService) {}
  @Get() @EvidenceReadAccess() list(
    @Req() req: any,
    @Param('buildingId') id: string,
    @Query()
    query: { q?: string; category?: string; cursor?: string; history?: string },
  ) {
    return this.service.list(internal(req), id, query);
  }
  @Post()
  @UseGuards(BuildingDocumentUploadGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: any,
    @Param('buildingId') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.service.upload(internal(req), id, file, body);
  }
  @Get('grants') grants(@Req() req: any, @Param('buildingId') id: string) {
    return this.service.grants(internal(req), id);
  }
  @Put('grants/:userId') grant(
    @Req() req: any,
    @Param('buildingId') id: string,
    @Param('userId') user: string,
    @Body() body: { canUpload: boolean },
  ) {
    return this.service.setGrant(internal(req), id, user, body.canUpload);
  }
  @Get(':id/content') @EvidenceReadAccess() async content(
    @Req() req: any,
    @Param('buildingId') building: string,
    @Param('id') id: string,
  ) {
    return stream(await this.service.content(internal(req), building, id));
  }
}
@Controller('client-portal/buildings/:buildingId/documents')
@UseGuards(ClientJwtGuard, OrganizationStatusGuard)
export class BuildingDocumentsClientController {
  constructor(private readonly service: BuildingDocumentsService) {}
  @Get() @EvidenceReadAccess() list(
    @Req() req: any,
    @Param('buildingId') id: string,
    @Query()
    query: { q?: string; category?: string; cursor?: string; history?: string },
  ) {
    return this.service.list(client(req), id, query);
  }
  @Post()
  @UseGuards(BuildingDocumentUploadGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Req() req: any,
    @Param('buildingId') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    return this.service.upload(client(req), id, file, body);
  }
  @Get('grants') grants(@Req() req: any, @Param('buildingId') id: string) {
    return this.service.grants(client(req), id);
  }
  @Put('grants/:userId') grant(
    @Req() req: any,
    @Param('buildingId') id: string,
    @Param('userId') user: string,
    @Body() body: { canUpload: boolean },
  ) {
    return this.service.setGrant(client(req), id, user, body.canUpload);
  }
  @Get(':id/content') @EvidenceReadAccess() async content(
    @Req() req: any,
    @Param('buildingId') building: string,
    @Param('id') id: string,
  ) {
    return stream(await this.service.content(client(req), building, id));
  }
}
