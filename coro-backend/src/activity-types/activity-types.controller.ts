import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdviserActor } from '../auth/project-access';
import { ActivityTypeInputDto, ActivityTypeOrderDto } from './activity-types.dto';
import { ActivityTypesService } from './activity-types.service';

@Controller('activity-types')
@UseGuards(AuthGuard('jwt'))
export class ActivityTypesController {
  constructor(private readonly service: ActivityTypesService) {}
  @Get() list(@Request() req: { user: AdviserActor }, @Query('includeArchived') value?: string) { return this.service.list(req.user, value === 'true'); }
  @Get(':id') get(@Param('id') id: string, @Request() req: { user: AdviserActor }) { return this.service.get(id, req.user); }
  @Post() create(@Body() dto: ActivityTypeInputDto, @Request() req: { user: AdviserActor }) { return this.service.create(dto, req.user); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: ActivityTypeInputDto, @Request() req: { user: AdviserActor }) { return this.service.update(id, dto, req.user); }
  @Put(':id/order') reorder(@Param('id') id: string, @Body() dto: ActivityTypeOrderDto, @Request() req: { user: AdviserActor }) { return this.service.reorder(id, dto.displayOrder, req.user); }
  @Post(':id/archive') archive(@Param('id') id: string, @Request() req: { user: AdviserActor }) { return this.service.archive(id, req.user); }
  @Post(':id/restore') restore(@Param('id') id: string, @Request() req: { user: AdviserActor }) { return this.service.restore(id, req.user); }
  @Delete(':id') remove(@Param('id') id: string, @Request() req: { user: AdviserActor }) { return this.service.remove(id, req.user); }
}
