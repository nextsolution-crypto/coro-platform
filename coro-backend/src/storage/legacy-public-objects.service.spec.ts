import { LegacyPublicObjectsService } from './legacy-public-objects.service';
import { StorageService } from './storage.service';

describe('Retrait de la lecture publique des anciens fichiers clients', () => {
  const cdn = 'https://coro-storage.tor1.digitaloceanspaces.com';

  it('reconnaît seulement les URL publiques de coro-storage', () => {
    const storage = new StorageService();
    expect(storage.historicalPublicStorageKey(`${cdn}/documents/p-1-FR.pdf`)).toBe('documents/p-1-FR.pdf');
    expect(storage.historicalPublicStorageKey('https://autre.example/doc.pdf')).toBeNull();
    expect(storage.historicalPublicStorageKey(`${cdn}/documents/a.pdf?x=1`)).toBeNull();
    expect(storage.historicalPublicStorageKey('coro-private:v1:abc')).toBeNull();
    expect(storage.historicalPublicStorageKey(null)).toBeNull();
  });

  it('rend privés les objets publics, sans rien supprimer, et met à jour les fichiers de projet', async () => {
    const storage = new StorageService();
    const privatized: string[] = [];
    (storage as any).makeObjectPrivate = jest.fn(async (key: string) => void privatized.push(key));
    const updates: any[] = [];
    const prisma: any = {
      project: {
        findMany: jest.fn(async () => [
          { exportedPdfFr: `${cdn}/documents/p-1-FR.pdf`, exportedPdfEn: null, officialPdfFr: 'coro-private:v1:abc', officialPdfEn: `${cdn}/documents/p-1-EN-OFFICIEL.pdf` },
        ]),
      },
      projectFile: {
        findMany: jest.fn(async () => [
          { id: 'f1', url: `${cdn}/files/plan.pdf`, storageKey: 'files/plan.pdf' },
          { id: 'f2', url: `${cdn}/files/plan.pdf`, storageKey: 'files/plan.pdf' },
        ]),
        updateMany: jest.fn(async (args: any) => void updates.push(args)),
      },
    };
    const result = await new LegacyPublicObjectsService(prisma, storage).run();
    expect(result).toEqual({ candidates: 3, privatized: 3, failed: 0 });
    expect(privatized.sort()).toEqual(['documents/p-1-EN-OFFICIEL.pdf', 'documents/p-1-FR.pdf', 'files/plan.pdf']);
    expect(updates).toEqual([{ where: { id: { in: ['f1', 'f2'] } }, data: { url: 'private:project-file' } }]);
  });

  it('continue et compte les échecs sans interrompre le démarrage', async () => {
    const storage = new StorageService();
    (storage as any).makeObjectPrivate = jest.fn(async () => { throw new Error('down'); });
    const prisma: any = {
      project: { findMany: jest.fn(async () => [{ exportedPdfFr: `${cdn}/documents/x.pdf` }]) },
      projectFile: { findMany: jest.fn(async () => []), updateMany: jest.fn() },
    };
    expect(await new LegacyPublicObjectsService(prisma, storage).run()).toEqual({ candidates: 1, privatized: 0, failed: 1 });
  });
});
