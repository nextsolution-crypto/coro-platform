import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { BlogService } from './blog.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('blog')
export class BlogController {

  constructor(private blogService: BlogService) {}

  // ── Public endpoints (vitrine) ──
  @Get('public')
  async getPublished() {
    return this.blogService.findPublished();
  }

  @Get('public/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  // ── Admin endpoints (plateforme) ──
  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll() {
    return this.blogService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  async findOne(@Param('id') id: string) {
    return this.blogService.findById(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() body: any) {
    if (!body.slug && body.titleFr) {
      body.slug = this.blogService.generateSlug(body.titleFr);
    }
    return this.blogService.create(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  async update(@Param('id') id: string, @Body() body: any) {
    return this.blogService.update(id, body);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'))
  async publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Post(':id/publish')
  @UseGuards(AuthGuard('jwt'))
  async publishWithDate(@Param('id') id: string, @Body() body: { publishedAt?: string }) {
    const date = body.publishedAt ? new Date(body.publishedAt) : undefined;
    return this.blogService.publish(id, date);
  }

  @Post(':id/schedule')
  @UseGuards(AuthGuard('jwt'))
  async schedule(@Param('id') id: string, @Body() body: { scheduledAt: string }) {
    return this.blogService.schedule(id, new Date(body.scheduledAt));
  }

  @Post(':id/unpublish')
  @UseGuards(AuthGuard('jwt'))
  async unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  async remove(@Param('id') id: string) {
    return this.blogService.remove(id);
  }
}