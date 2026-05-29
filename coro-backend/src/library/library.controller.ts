import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LibraryService } from './library.service';

@Controller('library')
@UseGuards(AuthGuard('jwt'))
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
    return this.libraryService.createProcedure(body);
  }

  @Put('procedures/:id')
  updateProcedure(@Param('id') id: string, @Body() body: any) {
    return this.libraryService.updateProcedure(id, body);
  }
}