import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingsService } from './buildings.service';

@Controller('buildings')
@UseGuards(AuthGuard('jwt'))
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Get()
  findAll(@Query('clientId') clientId: string | undefined, @Request() req: any) {
    return this.buildingsService.findAll(req.user.organizationId, clientId);
  }

  @Get(':id/projects')
  findProjects(@Param('id') id: string) {
  return this.buildingsService.findProjects(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.buildingsService.findOne(id, req.user.organizationId);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.buildingsService.create({ ...body, organizationId: req.user.organizationId });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.buildingsService.update(id, body, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.buildingsService.remove(id, req.user.organizationId);
  }
}