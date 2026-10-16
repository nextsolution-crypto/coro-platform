import { BadRequestException } from '@nestjs/common';

export const GOVERNED_CURRENCY = 'CAD' as const;
export const GOVERNED_CURRENCY_ERROR = 'CAD_ONLY_CURRENCY_REQUIRED';

export function governedCurrency(
  value: unknown,
  options: { defaultWhenMissing?: boolean } = {},
): typeof GOVERNED_CURRENCY {
  if (value === GOVERNED_CURRENCY) return GOVERNED_CURRENCY;
  if (value === undefined && options.defaultWhenMissing)
    return GOVERNED_CURRENCY;
  throw new BadRequestException(GOVERNED_CURRENCY_ERROR);
}

export function governedOptionalCurrency(
  value: unknown,
): typeof GOVERNED_CURRENCY | undefined {
  return value === undefined ? undefined : governedCurrency(value);
}
