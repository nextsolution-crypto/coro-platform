import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TaskTemplatesService } from './task-templates.service';

@Controller('task-templates')
@UseGuards(AuthGuard('jwt'))
export class TaskTemplatesController {
  constructor(private readonly service: TaskTemplatesService) {}

  // SuperAdmin — templates globaux
  @Get()
  getAll() {
    return this.service.getAll();
  }

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

  @Post('seed')
  seed() {
    return this.service.seedDefaultTemplates();
  }

  // Admin client — templates de son organisation
  @Get('my')
  getMyTemplates(@Request() req: any) {
    return this.service.getAllForOrg(req.user.organizationId);
  }

  @Post('my')
  createForOrg(@Body() dto: any, @Request() req: any) {
    return this.service.create({ ...dto, organizationId: req.user.organizationId });
  }

  // Templates globaux + organisation combinés (référence pour admin client)
  @Get('combined')
  getCombined(@Request() req: any) {
    return this.service.getAllWithGlobal(req.user.organizationId);
  }
}