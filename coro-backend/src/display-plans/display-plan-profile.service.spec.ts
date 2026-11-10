import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  DISPLAY_PLAN_PROFILES,
  DisplayPlanProfile,
  DisplayPlanProfileService,
} from './display-plan-profile.service';

describe('DisplayPlanProfileService', () => {
  const service = new DisplayPlanProfileService();
  const source = Buffer.alloc(24);

  beforeAll(() => {
    source.writeUInt8(0x89, 0);
    source.write('PNG', 1, 'ascii');
    source.writeUInt32BE(5100, 16);
    source.writeUInt32BE(3300, 20);
  });

  it.each(Object.keys(DISPLAY_PLAN_PROFILES) as DisplayPlanProfile[])(
    'prepares %s with contain geometry and exact canvas dimensions',
    (profile) => {
      const first = service.prepare(source, profile);
      const second = service.prepare(source, profile);
      expect(first).toMatchObject({
        profile,
        ...DISPLAY_PLAN_PROFILES[profile],
        fit: 'CONTAIN',
      });
      expect(first.contentWidth / first.contentHeight).toBeCloseTo(
        5100 / 3300,
        3,
      );
      expect(first.marginLeft).toBeGreaterThanOrEqual(0);
      expect(first.marginTop).toBeGreaterThanOrEqual(0);
      expect(first.bytes).toEqual(second.bytes);
      expect(first.bytes.toString()).toContain(
        'preserveAspectRatio="xMidYMid meet"',
      );
      expect(createHash('sha256').update(first.bytes).digest('hex')).toBe(
        createHash('sha256').update(second.bytes).digest('hex'),
      );
    },
  );

  it('rejects malformed or oversized raster sources', () => {
    expect(() =>
      service.prepare(Buffer.from('not-png'), 'SCREEN_16X9'),
    ).toThrow(BadRequestException);
    const oversized = Buffer.from(source);
    oversized.writeUInt32BE(20_000, 16);
    expect(() => service.prepare(oversized, 'SCREEN_16X9')).toThrow(
      'Dimensions',
    );
  });
});
