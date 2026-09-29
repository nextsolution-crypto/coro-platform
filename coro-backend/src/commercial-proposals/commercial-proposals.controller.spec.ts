import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { readFileSync } from 'fs';
import { PLATFORM_ROLES_KEY } from '../auth/platform-roles.decorator';
jest.mock('puppeteer', () => ({ __esModule: true, default: {} }));
import {
  CommercialProposalsController,
  CommercialProspectsController,
} from './commercial-proposals.controller';

describe('Commercial proposals API security contract', () => {
  it.each([
    [CommercialProposalsController, 'admin/v1/commercial/proposals'],
    [CommercialProspectsController, 'admin/v1/commercial/prospects'],
  ])('protects %p as SUPER_ADMIN', (controller, path) => {
    expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(path);
    expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, controller)).toEqual([
      'SUPER_ADMIN',
    ]);
    expect(Reflect.getMetadata(GUARDS_METADATA, controller)).toHaveLength(2);
  });

  it('has no DELETE, public or client endpoint', () => {
    const source = readFileSync(
      __dirname + '/commercial-proposals.controller.ts',
      'utf8',
    );
    expect(source).not.toContain('@Delete');
    expect(source).not.toContain('public/');
    expect(source).not.toContain('client-portal');
  });
});
