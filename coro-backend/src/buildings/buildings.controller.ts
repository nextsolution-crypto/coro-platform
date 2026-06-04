import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BuildingsService } from './buildings.service';

@Controller('buildings')
@UseGuards(AuthGuard('jwt'))
export class BuildingsController {
  constructor(private buildingsService: BuildingsService) {}

  @Get()
  findAll(@Query('clientId') clientId?: string) {
    return this.buildingsService.findAll(clientId);
  }

  @Get(':id/projects')
  findProjects(@Param('id') id: string) {
  return this.buildingsService.findProjects(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.buildingsService.findOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.buildingsService.create(body);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.buildingsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.buildingsService.remove(id);
  }
}