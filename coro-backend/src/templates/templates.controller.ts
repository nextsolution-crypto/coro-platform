import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(AuthGuard('jwt'))
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.templatesService.findAll(req.user.organizationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.findOne(id, req.user.organizationId);
  }

  @Post('from-project/:projectId')
  createFromProject(
    @Param('projectId') projectId: string,
    @Body() body: { name: string; description?: string },
    @Request() req: any,
  ) {
    return this.templatesService.createFromProject(
      projectId, req.user.organizationId, req.user.userId, body.name, body.description
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.templatesService.remove(id, req.user.organizationId);
  }
}