import { Injectable } from '@nestjs/common';
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
    return this.prisma.blogPost.update({ where: { id }, data });
  }

  async publish(id: string) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  async unpublish(id: string) {
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.blogPost.delete({ where: { id } });
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