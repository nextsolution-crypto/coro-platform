import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

const EDITABLE_FIELDS = [
  'slug', 'titleFr', 'titleEn', 'excerptFr', 'excerptEn', 'contentFr', 'contentEn',
  'coverImage', 'category', 'tags', 'authorName', 'authorTitle',
  'seoTitleFr', 'seoTitleEn', 'seoDescFr', 'seoDescEn',
] as const;

/**
 * Date de publication saisie dans l'éditeur.
 * - vide → null ;
 * - « AAAA-MM-JJ » (champ date) → midi UTC ce jour-là, pour que la date
 *   affichée reste la même au Québec (minuit UTC tombait la veille) ;
 * - date ISO complète → telle quelle.
 */
export function toPublicationDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new BadRequestException('Date de publication invalide.');
    return value;
  }
  if (typeof value !== 'string') throw new BadRequestException('Date de publication invalide.');
  const text = value.trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T12:00:00.000Z`) : new Date(text);
  if (Number.isNaN(date.getTime())) throw new BadRequestException('Date de publication invalide.');
  return date;
}

/** Ne garde que les champs modifiables : jamais id, createdAt ni l'état de publication. */
export function editableBlogFields(body: Record<string, unknown>) {
  const data: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === 'tags') {
      const tags = Array.isArray(body.tags) ? body.tags : typeof body.tags === 'string' ? body.tags.split(',') : [];
      data.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    } else {
      data[key] = body[key];
    }
  }
  return data;
}

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
    const now = new Date();
    return this.prisma.blogPost.findMany({
      where: {
        isPublished: true,
        publishedAt: { not: null, lte: now },
      },
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

  async findPublishedForFeed() {
    const now = new Date();
    return this.prisma.blogPost.findMany({
      where: {
        isPublished: true,
        publishedAt: { not: null, lte: now },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        slug: true,
        titleFr: true,
        titleEn: true,
        excerptFr: true,
        excerptEn: true,
        contentFr: true,
        contentEn: true,
        coverImage: true,
        category: true,
        authorName: true,
        authorTitle: true,
        publishedAt: true,
        updatedAt: true,
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.blogPost.findFirst({
      where: {
        slug,
        isPublished: true,
        publishedAt: { not: null, lte: new Date() },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.blogPost.findUnique({
      where: { id },
    });
  }

  async create(body: Record<string, unknown>) {
    const data = editableBlogFields(body);
    if (!data.titleFr || !data.contentFr) throw new BadRequestException('Le titre et le contenu FR sont obligatoires.');
    if (!data.slug) data.slug = this.generateSlug(String(data.titleFr));
    if (!data.titleEn) data.titleEn = data.titleFr;
    if (!data.contentEn) data.contentEn = data.contentFr;
    const publishedAt = toPublicationDate(body.publishedAt);
    return this.prisma.blogPost.create({ data: { ...(data as any), publishedAt } });
  }

  /**
   * Enregistre l'article. La date de publication n'est modifiée que si elle
   * est envoyée : c'est ce qui permet d'anti-dater un article déjà publié.
   */
  async update(id: string, body: Record<string, unknown>) {
    const data: Record<string, unknown> = editableBlogFields(body);
    if ('publishedAt' in body) {
      const publishedAt = toPublicationDate(body.publishedAt);
      // Un article publié garde toujours une date : vider le champ ne la retire pas.
      if (publishedAt) data.publishedAt = publishedAt;
      else {
        const current = await this.prisma.blogPost.findUnique({ where: { id }, select: { isPublished: true } });
        if (!current?.isPublished) data.publishedAt = null;
      }
    }
    return this.prisma.blogPost.update({ where: { id }, data: data as any });
  }

  async publish(id: string, requestedDate?: unknown) {
    // Sans date demandée, on garde celle déjà saisie (brouillon anti-daté) ; sinon maintenant.
    let publishedAt = toPublicationDate(requestedDate);
    if (!publishedAt) {
      const current = await this.prisma.blogPost.findUnique({ where: { id }, select: { publishedAt: true } });
      publishedAt = current?.publishedAt ?? new Date();
    }
    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt,
        scheduledAt: null,
      },
    });
  }

  async schedule(id: string, scheduledAt: Date) {
    if (Number.isNaN(scheduledAt.getTime())) throw new BadRequestException('Date de programmation invalide.');
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
