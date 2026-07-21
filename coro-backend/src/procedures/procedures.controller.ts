import { Controller, Get, Put, Post, Delete, Param, Body, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProceduresService } from './procedures.service';

@Controller('procedures')
@UseGuards(AuthGuard('jwt'))
export class ProceduresController {
  constructor(private proceduresService: ProceduresService) {}

  // ── Toutes les procédures par défaut ───────────────────────
  @Get()
  findAll() {
    return this.proceduresService.findAll();
  }

  // ── Toutes les procédures d'un projet (avec overrides) ─────
  @Get('project/:projectId')
  findAllForProject(@Param('projectId') projectId: string, @Request() req: any) {
    return this.proceduresService.findAllForProject(req.user.organizationId, projectId);
  }

  // ── Une procédure (avec override projet ou org si applicable) ──
  @Get(':id')
  findOne(@Param('id') id: string, @Query('projectId') projectId: string, @Request() req: any) {
    return this.proceduresService.findOne(id, req.user.organizationId, projectId);
  }

  // ── Sauvegarder un override par projet ─────────────────────
  @Put(':id/project/:projectId')
  updateForProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: { content: any },
    @Request() req: any,
  ) {
    return this.proceduresService.updateForProject(id, req.user.organizationId, projectId, body.content);
  }

  // ── Activer/désactiver une procédure pour un projet ────────
  @Put(':id/project/:projectId/toggle')
  toggleActiveForProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Body() body: { isActive: boolean },
    @Request() req: any,
  ) {
    return this.proceduresService.toggleActiveForProject(id, req.user.organizationId, projectId, body.isActive);
  }

  // ── Restaurer la version par défaut pour un projet ─────────
  @Delete(':id/project/:projectId')
  restoreForProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
    @Request() req: any,
  ) {
    return this.proceduresService.restoreForProject(id, req.user.organizationId, projectId);
  }

  // ── Modifier la procédure par défaut (SUPER_ADMIN) ─────────
  @Put(':id/default')
  updateDefault(@Param('id') id: string, @Body() body: { content: any }, @Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
    return this.proceduresService.updateDefault(id, body.content);
  }
}