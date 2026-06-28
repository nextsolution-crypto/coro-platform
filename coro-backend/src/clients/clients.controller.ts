import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService } from './clients.service';

@Controller('clients')
@UseGuards(AuthGuard('jwt'))
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.clientsService.findAll(req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.clientsService.findOne(id, req.user.organizationId);
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.clientsService.create({ ...body, organizationId: req.user.organizationId });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.clientsService.update(id, body, req.user.organizationId);
  }

  @Put(':id/logo')
  uploadLogo(@Param('id') id: string, @Body() body: { logoBase64: string }, @Request() req: any) {
    return this.clientsService.uploadLogo(id, body.logoBase64, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.clientsService.remove(id, req.user.organizationId);
  }
}