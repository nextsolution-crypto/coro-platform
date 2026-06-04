import { Controller, Get, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Module4Service } from './module4.service';

@Controller('procedures')
@UseGuards(AuthGuard('jwt'))
export class LibraryController {

  constructor(private readonly module4Service: Module4Service) {}

  @Get('library')
  async getLibrary() {
    return this.module4Service.getLibrary();
  }

  @Get(':procedureId/full')
  async getProcedureFull(@Param('procedureId') procedureId: string) {
    return this.module4Service.getProcedureFull(procedureId);
  }
}