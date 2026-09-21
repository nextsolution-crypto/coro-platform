import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService } from './clients.service';
import { UpdateClientUserOperationalPermissionsDto } from './dto/update-client-user-operational-permissions.dto';

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

  @Get(':id/client-users')
  findClientUsers(@Param('id') id: string, @Request() req: any) {
    return this.clientsService.findClientUsers(id, req.user);
  }

  @Get(':id/client-users/:clientUserId/operational-permissions')
  getClientUserOperationalPermissions(
    @Param('id') id: string,
    @Param('clientUserId') clientUserId: string,
    @Request() req: any,
  ) {
    return this.clientsService.getClientUserOperationalPermissions(
      id,
      clientUserId,
      req.user,
    );
  }

  @Put(':id/client-users/:clientUserId/operational-permissions')
  updateClientUserOperationalPermissions(
    @Param('id') id: string,
    @Param('clientUserId') clientUserId: string,
    @Body() body: UpdateClientUserOperationalPermissionsDto,
    @Request() req: any,
  ) {
    return this.clientsService.updateClientUserOperationalPermissions(
      id,
      clientUserId,
      body,
      req.user,
    );
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
