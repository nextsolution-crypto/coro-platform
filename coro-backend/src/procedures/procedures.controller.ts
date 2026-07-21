import { Controller, Get, Put, Post, Param, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProceduresService } from './procedures.service';

@Controller('procedures')
@UseGuards(AuthGuard('jwt'))
export class ProceduresController {
  constructor(private proceduresService: ProceduresService) {}

  // Toutes les procédures par défaut (lecture seule, tout le monde)
  @Get()
  findAll() {
    return this.proceduresService.findAll();
  }

  // Une procédure complète (override org si existe, sinon défaut)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.proceduresService.findOne(id, req.user.organizationId);
  }

  // Modifier une procédure (crée un override pour cette organisation)
  @Put(':id')
  update(@Param('id') id: string, @Body() body: { content: any }, @Request() req: any) {
    return this.proceduresService.update(id, req.user.organizationId, body.content);
  }

  // Restaurer la procédure par défaut (supprimer l'override)
  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req: any) {
    return this.proceduresService.restore(id, req.user.organizationId);
  }

  // Modifier la procédure par défaut (SUPER_ADMIN seulement)
  @Put(':id/default')
  updateDefault(@Param('id') id: string, @Body() body: { content: any }, @Request() req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
    return this.proceduresService.updateDefault(id, body.content);
  }
}