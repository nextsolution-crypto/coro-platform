import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChangelogService } from './changelog.service';

@Controller('changelog')
@UseGuards(AuthGuard('jwt'))
export class ChangelogController {
  constructor(private changelogService: ChangelogService) {}

  private assertSuperAdmin(req: any) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Accès réservé au super-administrateur.');
    }
  }

  @Get()
  findAll(@Request() req: any) {
    this.assertSuperAdmin(req);
    return this.changelogService.findAll();
  }

  @Post()
  create(@Body() body: { title: string; description: string }, @Request() req: any) {
    this.assertSuperAdmin(req);
    return this.changelogService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    this.assertSuperAdmin(req);
    return this.changelogService.remove(id);
  }
}