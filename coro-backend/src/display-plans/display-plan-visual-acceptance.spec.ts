import { ConflictException } from '@nestjs/common';
import { assertCurrentVisualAcceptance } from './display-plan-visual-acceptance';

describe('assertCurrentVisualAcceptance', () => {
  const authority = {
    sourceVersion: 3,
    sourceSha256: 'a'.repeat(64),
    variantVersion: 2,
    variantSha256: 'b'.repeat(64),
    locationId: '13b22707-5864-47cd-b638-08b40dca0047',
    widthPixels: 3840,
    heightPixels: 2160,
  };
  const acceptance = {
    expectedLockVersion: 4,
    reason: 'Approbation humaine explicite',
    requestId: 'visual-approval-1',
    ...authority,
    variantSha256: 'b'.repeat(64),
    profile: 'SCREEN_16X9' as const,
  };

  it('accepts the exact source, render version, hash, and location', () => {
    expect(() =>
      assertCurrentVisualAcceptance(authority, acceptance),
    ).not.toThrow();
  });

  it.each([
    ['sourceVersion', 2],
    ['sourceSha256', 'c'.repeat(64)],
    ['variantVersion', 1],
    ['variantSha256', 'd'.repeat(64)],
    ['locationId', '4ea85c8d-da29-4a41-84f7-befca66010fb'],
  ] as const)('rejects stale or mismatched %s', (field, value) => {
    expect(() =>
      assertCurrentVisualAcceptance(authority, {
        ...acceptance,
        [field]: value,
      }),
    ).toThrow(ConflictException);
  });

  it('rejects a profile that does not match the governed render dimensions', () => {
    expect(() =>
      assertCurrentVisualAcceptance(authority, {
        ...acceptance,
        profile: 'SCREEN_16X10',
      }),
    ).toThrow(ConflictException);
  });
});
