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

describe('BlogService anti-datation', () => {
  const update = jest.fn();
  const create = jest.fn();
  const findUnique = jest.fn();
  const prisma = { blogPost: { update, create, findUnique } } as unknown as PrismaService;
  const service = new BlogService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    update.mockResolvedValue({});
    create.mockResolvedValue({});
  });

  it('enregistre une date du champ date (AAAA-MM-JJ) sans changer de jour au Québec', async () => {
    await service.update('p1', { titleFr: 'T', publishedAt: '2025-05-01' });
    const data = update.mock.calls[0][0].data;
    expect(data.publishedAt.toISOString()).toBe('2025-05-01T12:00:00.000Z');
    expect(data.publishedAt.toLocaleDateString('fr-CA', { timeZone: 'America/Toronto' })).toBe('2025-05-01');
  });

  it("ignore les champs non modifiables envoyés par l'éditeur", async () => {
    await service.update('p1', { id: 'x', createdAt: 'y', updatedAt: 'z', isPublished: true, titleFr: 'T' });
    const data = update.mock.calls[0][0].data;
    expect(data).toEqual({ titleFr: 'T' });
  });

  it("garde la date d'un article publié quand le champ est vidé", async () => {
    findUnique.mockResolvedValue({ isPublished: true });
    await service.update('p1', { publishedAt: '' });
    expect(update.mock.calls[0][0].data).toEqual({});
  });

  it('publie à la date demandée', async () => {
    await service.publish('p1', '2024-03-15');
    expect(update.mock.calls[0][0].data.publishedAt.toISOString()).toBe('2024-03-15T12:00:00.000Z');
  });

  it("publie un brouillon anti-daté à sa date, sans la remplacer par aujourd'hui", async () => {
    findUnique.mockResolvedValue({ publishedAt: new Date('2024-01-10T12:00:00.000Z') });
    await service.publish('p1');
    expect(update.mock.calls[0][0].data.publishedAt.toISOString()).toBe('2024-01-10T12:00:00.000Z');
  });

  it('refuse une date invalide au lieu de planter', async () => {
    await expect(service.update('p1', { publishedAt: 'pas une date' })).rejects.toThrow('Date de publication invalide.');
    expect(update).not.toHaveBeenCalled();
  });

  it('crée un article avec sa date anti-datée', async () => {
    await service.create({ titleFr: 'Titre', contentFr: 'Texte', publishedAt: '2023-09-01', tags: 'a, b' });
    const data = create.mock.calls[0][0].data;
    expect(data.publishedAt.toISOString()).toBe('2023-09-01T12:00:00.000Z');
    expect(data.slug).toBe('titre');
    expect(data.tags).toEqual(['a', 'b']);
  });
});
