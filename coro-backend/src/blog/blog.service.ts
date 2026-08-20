import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId?: string) {
    return this.prisma.blogPost.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        titleFr: true,
        titleEn: true,
        excerptFr: true,
        excerptEn: true,
        coverImage: true,
        category: true,
        tags: true,
        authorName: true,
        authorTitle: true,
        isPublished: true,
        publishedAt: true,
        scheduledAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findPublished() {
    return this.prisma.blogPost.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        titleFr: true,
        titleEn: true,
        excerptFr: true,
        excerptEn: true,
        coverImage: true,
        category: true,
        tags: true,
        authorName: true,
        publishedAt: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.blogPost.findUnique({
      where: { slug },
    });
  }

  async findById(id: string) {
    return this.prisma.blogPost.findUnique({
      where: { id },
    });
  }

  async create(data: {
    slug: string;
    titleFr: string;
    titleEn: string;
    excerptFr?: string;
    excerptEn?: string;
    contentFr: string;
    contentEn: string;
    coverImage?: string;
    category?: string;
    tags?: string[];
    authorName?: string;
    authorTitle?: string;
    seoTitleFr?: string;
    seoTitleEn?: string;
    seoDescFr?: string;
    seoDescEn?: string;
  }) {
    return this.prisma.blogPost.create({ data });
  }

  async update(id: string, data: any) {
    const clean = { ...data };
    if (clean.publishedAt === '' || clean.publishedAt === undefined) clean.publishedAt = null;
    if (clean.scheduledAt === '' || clean.scheduledAt === undefined) clean.scheduledAt = null;
    return this.prisma.blogPost.update({ where: { id }, data: clean });
  }

    async publish(id: string, publishedAt?: Date) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: publishedAt || new Date(),
        scheduledAt: null,
      },
    });
  }

  async schedule(id: string, scheduledAt: Date) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: false,
        scheduledAt,
        publishedAt: null,
      },
    });
  }

  async unpublish(id: string) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: false,
        publishedAt: null,
        scheduledAt: null,
      },
    });
  }

  async publishScheduled() {
    const now = new Date();
    const toPublish = await this.prisma.blogPost.findMany({
      where: {
        isPublished: false,
        scheduledAt: {
          lte: now,
          not: null,
        },
      },
    });
    for (const post of toPublish) {
      await this.prisma.blogPost.update({
        where: { id: post.id },
        data: {
          isPublished: true,
          publishedAt: post.scheduledAt,
          scheduledAt: null,
        },
      });
    }
    return toPublish.length;
  }

  async remove(id: string) {
    return this.prisma.blogPost.delete({ where: { id } });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledPosts() {
    const count = await this.publishScheduled();
    if (count > 0) {
      new Logger('BlogService').log(`[BLOG] ${count} article(s) programmé(s) publié(s) automatiquement.`);
    }
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}