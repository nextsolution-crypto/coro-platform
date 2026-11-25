import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards, Request, ForbiddenException,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { AuthGuard } from '@nestjs/passport';

/** Le blogue est celui du site public getcoro.io : seul le super-administrateur le gère. */
function requireSuperAdmin(req: any) {
  if (req?.user?.role !== 'SUPER_ADMIN') {
    throw new ForbiddenException('Accès réservé au super-administrateur.');
  }
}

@Controller('blog')
export class BlogController {

  constructor(private blogService: BlogService) {}

  // ── Public endpoints (vitrine) ──
  @Get('public')
  async getPublished() {
    return this.blogService.findPublished();
  }

  @Get('public/feed')
  async getPublishedFeed() {
    return this.blogService.findPublishedForFeed();
  }

  @Get('public/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  // ── Admin endpoints (plateforme) ──
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Request() req: any) {
    requireSuperAdmin(req);
    return this.blogService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Request() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.blogService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Request() req: any, @Body() body: any) {
    requireSuperAdmin(req);
    return this.blogService.create(body ?? {});
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    requireSuperAdmin(req);
    return this.blogService.update(id, body ?? {});
  }

  // Une seule route : l'ancienne copie sans corps faisait ignorer la date choisie.
  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'))
  async publish(@Request() req: any, @Param('id') id: string, @Body() body: { publishedAt?: string }) {
    requireSuperAdmin(req);
    return this.blogService.publish(id, body?.publishedAt);
  }

  @Post(':id/schedule')
  @UseGuards(AuthGuard('jwt'))
  async schedule(@Request() req: any, @Param('id') id: string, @Body() body: { scheduledAt: string }) {
    requireSuperAdmin(req);
    return this.blogService.schedule(id, new Date(body?.scheduledAt));
  }

  @Post(':id/unpublish')
  @UseGuards(AuthGuard('jwt'))
  async unpublish(@Request() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.blogService.unpublish(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Request() req: any, @Param('id') id: string) {
    requireSuperAdmin(req);
    return this.blogService.remove(id);
  }
}
