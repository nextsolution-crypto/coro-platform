import { BadRequestException } from '@nestjs/common';
import {
  GOVERNED_CURRENCY,
  GOVERNED_CURRENCY_ERROR,
  governedCurrency,
  governedOptionalCurrency,
} from './financial-currency';

describe('CAD-only governed currency', () => {
  it('accepts explicit CAD and defaults an omitted eligible currency', () => {
    expect(governedCurrency('CAD')).toBe(GOVERNED_CURRENCY);
    expect(governedCurrency(undefined, { defaultWhenMissing: true })).toBe(
      GOVERNED_CURRENCY,
    );
    expect(governedOptionalCurrency(undefined)).toBeUndefined();
  });

  it.each(['USD', 'EUR', 'GBP', 'CHF', 'ZZZ', 'cad', '', null])(
    'rejects unsupported new-write currency %p with a stable error',
    (currency) => {
      expect(() => governedCurrency(currency)).toThrow(
        new BadRequestException(GOVERNED_CURRENCY_ERROR),
      );
    },
  );

  it('rejects omission when the command does not define default semantics', () => {
    expect(() => governedCurrency(undefined)).toThrow(
      new BadRequestException(GOVERNED_CURRENCY_ERROR),
    );
  });
});
