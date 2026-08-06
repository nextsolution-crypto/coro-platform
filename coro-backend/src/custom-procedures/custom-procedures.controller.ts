import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomProceduresService } from './custom-procedures.service';

@Controller('custom-procedures')
@UseGuards(AuthGuard('jwt'))
export class CustomProceduresController {
  constructor(private service: CustomProceduresService) {}

  @Get('roles')
  getRoles() {
    return this.service.getKnownRoles();
  }

  @Get('library')
  getLibrary(@Request() req: any) {
    return this.service.getLibrary(req.user.organizationId);
  }

  @Get('project/:projectId')
  findAll(@Param('projectId') projectId: string, @Request() req: any) {
    return this.service.findAll(projectId, req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.service.findOne(id, req.user.organizationId);
  }

  @Post('generate')
  generate(@Body() body: { text: string; projectId: string }, @Request() req: any) {
    return this.service.generateFromText(
      body.text,
      body.projectId,
      req.user.organizationId,
      req.user.userId,
    );
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.service.update(id, body, req.user.organizationId);
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Body() body: { projectId: string },
    @Request() req: any,
  ) {
    return this.service.clone(id, body.projectId, req.user.organizationId, req.user.userId);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string, @Request() req: any) {
    return this.service.publish(id, req.user.organizationId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, req.user.organizationId);
  }
}