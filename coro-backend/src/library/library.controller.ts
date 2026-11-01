import { Controller, Get, Post, Put, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LibraryService } from './library.service';
import { OrganizationStatusGuard } from '../auth/organization-status.guard';

@Controller('library')
@UseGuards(AuthGuard('jwt'), OrganizationStatusGuard)
export class LibraryController {
  constructor(private libraryService: LibraryService) {}

  @Get('incident-codes')
  getIncidentCodes() {
    return this.libraryService.getIncidentCodes();
  }

  @Get('roles')
  getRoles() {
    return this.libraryService.getRoles();
  }

  @Get('procedures')
  getProcedures() {
    return this.libraryService.getProcedures();
  }

  @Post('procedures')
  createProcedure(@Body() body: any) {
    void body;
    throw new ForbiddenException(
      'La modification du catalogue global n’est pas autorisée par cette route.',
    );
  }

  @Put('procedures/:id')
  updateProcedure(@Param('id') id: string, @Body() body: any) {
    void id;
    void body;
    throw new ForbiddenException(
      'La modification du catalogue global n’est pas autorisée par cette route.',
    );
  }
}
