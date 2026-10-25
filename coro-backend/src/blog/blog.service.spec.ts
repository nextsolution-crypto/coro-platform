import { BlogService } from './blog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BlogService public publication boundaries', () => {
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const prisma = { blogPost: { findMany, findFirst } } as unknown as PrismaService;
  const service = new BlogService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
    findFirst.mockResolvedValue(null);
  });

  it('lists only published posts whose publication date has arrived', async () => {
    const before = new Date();
    await service.findPublished();
    const after = new Date();

    expect(findMany).toHaveBeenCalledTimes(1);
    const query = findMany.mock.calls[0][0];
    expect(query.where.isPublished).toBe(true);
    expect(query.where.publishedAt.not).toBeNull();
    expect(query.where.publishedAt.lte.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(query.where.publishedAt.lte.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(query.orderBy).toEqual({ publishedAt: 'desc' });
  });

  it('provides the feed only public source fields in deterministic order', async () => {
    await service.findPublishedForFeed();

    const query = findMany.mock.calls[0][0];
    expect(query.where.isPublished).toBe(true);
    expect(query.where.publishedAt.not).toBeNull();
    expect(query.orderBy).toEqual([{ publishedAt: 'desc' }, { id: 'asc' }]);
    expect(query.select.contentFr).toBe(true);
    expect(query.select.contentEn).toBe(true);
    expect(query.select.updatedAt).toBe(true);
    expect(query.select.scheduledAt).toBeUndefined();
  });

  it('denies direct public reads of drafts and future posts at the query boundary', async () => {
    await service.findBySlug('known-private-slug');

    expect(findFirst).toHaveBeenCalledTimes(1);
    const query = findFirst.mock.calls[0][0];
    expect(query.where).toMatchObject({ slug: 'known-private-slug', isPublished: true });
    expect(query.where.publishedAt.not).toBeNull();
    expect(query.where.publishedAt.lte).toBeInstanceOf(Date);
  });
});
