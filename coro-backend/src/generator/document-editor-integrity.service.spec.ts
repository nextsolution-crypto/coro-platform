import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DocumentEditorIntegrityService } from './document-editor-integrity.service';

describe('DocumentEditorIntegrityService policy', () => {
  const service = new DocumentEditorIntegrityService({} as any);

  it('requires an explicit non-negative lock version', () => {
    expect(service.requireExpectedLockVersion(0)).toBe(0);
    expect(() => service.requireExpectedLockVersion(undefined)).toThrow(
      BadRequestException,
    );
    expect(() => service.requireExpectedLockVersion(-1)).toThrow(
      BadRequestException,
    );
  });

  it.each(['VALIDATED', 'ARCHIVED'] as const)(
    'makes %s projects immutable',
    (status) => {
      expect(() =>
        service.assertMutable({ isActive: true, status }, 'DRAFT'),
      ).toThrow(ForbiddenException);
    },
  );

  it.each(['VALIDATED', 'ARCHIVED'] as const)(
    'makes %s documents immutable',
    (status) => {
      expect(() =>
        service.assertMutable(
          { isActive: true, status: 'IN_PROGRESS' },
          status,
        ),
      ).toThrow(ForbiddenException);
    },
  );

  it('fails closed for inactive projects', () => {
    expect(() =>
      service.assertMutable({ isActive: false, status: 'DRAFT' }, 'DRAFT'),
    ).toThrow(NotFoundException);
  });
});
