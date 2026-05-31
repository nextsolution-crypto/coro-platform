// ============================================================
// CORO — Module 2 Controller
// Route : PUT /api/projects/:projectId/module2
//         GET /api/projects/:projectId/module2
// ============================================================

import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module2Service } from './module2.service';
import { SaveModule2Dto } from './dto/save-module2.dto';

@Controller('projects/:projectId/module2')
@UseGuards(AuthGuard('jwt'))
export class Module2Controller {

  constructor(private readonly module2Service: Module2Service) {}

  // --------------------------------------------------------
  // GET — Charger les données Module 2 d'un projet
  // --------------------------------------------------------
  @Get()
  async getModule2(@Param('projectId') projectId: string) {
    return this.module2Service.getModule2(projectId);
  }

  // --------------------------------------------------------
  // PUT — Sauvegarder (autosave) les données Module 2
  // --------------------------------------------------------
  @Put()
  @HttpCode(HttpStatus.OK)
  async saveModule2(
    @Param('projectId') projectId: string,
    @Body() dto: SaveModule2Dto,
  ) {
    return this.module2Service.saveModule2(projectId, dto);
  }
}