import { ForbiddenException } from '@nestjs/common';
import { LibraryController } from './library.controller';

describe('LibraryController global mutation policy', () => {
  const controller = new LibraryController({} as never);

  it('fails closed for the legacy global create route', () => {
    expect(() => controller.createProcedure({ code: 'QA-LIB' })).toThrow(ForbiddenException);
  });

  it('fails closed for the legacy global update route', () => {
    expect(() => controller.updateProcedure('qa-id', { titleFR: 'QA' })).toThrow(ForbiddenException);
  });
});
