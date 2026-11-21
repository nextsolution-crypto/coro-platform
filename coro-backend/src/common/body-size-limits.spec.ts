import { bodyLimitForPath } from './body-size-limits';

describe('limites de taille des requêtes (M3-07)', () => {
  it.each([
    ['/api/auth/login', '1mb'],
    ['/api/client-auth/login?x=1', '1mb'],
    ['/api/population/public/programs/a/subscribe', '1mb'],
    ['/api/occupancy/checkin', '10mb'],
    ['/api/projects/p/building-plans', '50mb'],
    ['/api/projects/p/module7', '50mb'],
    ['/api/configurator/import/p', '50mb'],
    ['/api/client-portal/buildings/b/panic', '50mb'],
    ['/', '50mb'],
  ])('%s → %s', (path, limit) => {
    expect(bodyLimitForPath(path)).toBe(limit);
  });
});
