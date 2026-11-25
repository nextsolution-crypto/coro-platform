import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProceduresService } from './procedures.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';

@Controller('procedures')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class ProceduresController {
  constructor(private proceduresService: ProceduresService) {}

  // ── Toutes les procédures par défaut ───────────────────────
  @Get()
  findAll() {
    return this.proceduresService.findAll();
  }

  // ── Toutes les procédures d'un projet (avec overrides) ─────
  @Get('project/:projectId')
  findAllForProject(
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.proceduresService.findAllForProject(
      projectId,
      req.user,
    );
  }

  // ── Créer une nouvelle procédure par défaut (SUPER_ADMIN) ──
  @Post('default')
  createDefault(@Body() body: { content: any }, @Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
    return this.proceduresService.createDefault(body.content);
  }

  // ── Supprimer une procédure par défaut (SUPER_ADMIN) ───────
  @Delete(':id/default')
  deleteDefault(@Param('id') id: string, @Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
    return this.proceduresService.deleteDefault(id);
  }

  // ── Une procédure (avec override projet ou org si applicable) ──
  // ── Procédures personnalisées par l'organisation (codes) ──
  @Get('organization-versions')
  organizationVersions(@Request() req: any) {
    return this.proceduresService.organizationVersions(req.user);
  }

  // ── Versions enregistrées (avant ':id' : routes spécifiques d'abord) ──
  @Get('variants')
  listVariants(@Query('procedureId') procedureId: string | undefined, @Request() req: any) {
    return this.proceduresService.listVariants(req.user, procedureId);
  }

  @Patch('variants/:variantId')
  updateVariant(@Param('variantId') variantId: string, @Body() body: any, @Request() req: any) {
    return this.proceduresService.updateVariant(variantId, body, req.user);
  }

  @Delete('variants/:variantId')
  deleteVariant(@Param('variantId') variantId: string, @Request() req: any) {
    return this.proceduresService.deleteVariant(variantId, req.user);
  }

  @Post('variants/:variantId/apply/:projectId')
  applyVariant(
    @Param('variantId') variantId: string,
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.proceduresService.applyVariant(variantId, projectId, req.user);
  }

  @Post('variants/:variantId/promote')
  promoteVariant(@Param('variantId') variantId: string, @Request() req: any) {
    return this.proceduresService.promoteVariant(variantId, req.user);
  }

  @Post(':id/variants')
  createVariant(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.proceduresService.createVariant(id, body, req.user);
  }

  // ── Version de l'organisation (administrateur) ──
  @Put(':id/organization')
  saveOrganizationVersion(@Param('id') id: string, @Body() body: { content: any }, @Request() req: any) {
    return this.proceduresService.saveOrganizationVersion(id, body?.content, req.user);
  }

  @Delete(':id/organization')
  resetOrganizationVersion(@Param('id') id: string, @Request() req: any) {
    return this.proceduresService.resetOrganizationVersion(id, req.user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.proceduresService.findOne(
      id,
      projectId,
      req.user,
    );
  }

  // ── Sauvegarder un override par projet ─────────────────────
  @Put(':id/project/:projectId')
  updateForProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: { content: any },
    @Request() req: any,
  ) {
    return this.proceduresService.updateForProject(
      id,
      projectId,
      body.content,
      req.user,
    );
  }

  // ── Activer/désactiver une procédure pour un projet ────────
  @Put(':id/project/:projectId/toggle')
  toggleActiveForProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    return this.proceduresService.toggleActiveForProject(
      id,
      projectId,
      body.isActive,
      req.user,
    );
  }

  // ── Restaurer la version par défaut pour un projet ─────────
  @Delete(':id/project/:projectId')
  restoreForProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.proceduresService.restoreForProject(id, projectId, req.user);
  }

  // ── Modifier la procédure par défaut (SUPER_ADMIN) ─────────
  @Put(':id/default')
  updateDefault(
    @Param('id') id: string,
    @Body() body: { content: any },
    @Request() req: any,
  ) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
    return this.proceduresService.updateDefault(id, body.content);
  }
}
