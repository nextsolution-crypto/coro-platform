import { Injectable } from '@nestjs/common';
import {
  parsePhoneNumberWithError,
  type PhoneNumber,
} from 'libphonenumber-js/max';
import { PhoneNumberError } from './phone-number.errors';
import type {
  NormalizedPhoneNumber,
  PhoneNumberContext,
} from './phone-number.types';

const PHONE_INPUT_PATTERN = /^\+?[\d\s().\-\u00a0\u202f]+$/u;

@Injectable()
export class PhoneNumberService {
  normalizePhoneNumber(
    input: string | null | undefined,
    context: PhoneNumberContext,
  ): NormalizedPhoneNumber {
    const normalizedInput = this.normalizeInput(input);
    const explicitInternational = normalizedInput.startsWith('+');

    if (!explicitInternational && !context.defaultCountry) {
      throw new PhoneNumberError('PHONE_COUNTRY_REQUIRED');
    }

    let parsed: PhoneNumber;
    try {
      parsed = explicitInternational
        ? parsePhoneNumberWithError(normalizedInput)
        : parsePhoneNumberWithError(normalizedInput, context.defaultCountry);
    } catch {
      throw new PhoneNumberError('PHONE_INVALID');
    }

    if (parsed.ext) {
      throw new PhoneNumberError('PHONE_EXTENSION_NOT_ALLOWED');
    }
    if (!parsed.isValid()) {
      throw new PhoneNumberError('PHONE_INVALID');
    }

    return {
      canonical: parsed.number,
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
      internationalDisplay: parsed.formatInternational(),
      nationalDisplay: parsed.formatNational(),
    };
  }

  validatePhoneNumber(
    input: string | null | undefined,
    context: PhoneNumberContext,
  ): boolean {
    try {
      this.normalizePhoneNumber(input, context);
      return true;
    } catch {
      return false;
    }
  }

  formatPhoneNumber(canonical: string, locale = 'en'): string {
    const parsed = this.normalizePhoneNumber(canonical, {
      purpose: 'CONTACT',
    });
    if (parsed.country === 'CA' && locale.toLowerCase().startsWith('fr-ca')) {
      return parsed.nationalDisplay;
    }
    if (parsed.country === 'CA' && locale.toLowerCase().startsWith('en-ca')) {
      return parsed.nationalDisplay;
    }
    return parsed.internationalDisplay;
  }

  maskPhoneNumber(canonical: string | null | undefined): string | null {
    if (!canonical) return null;
    const normalized = this.normalizePhoneNumber(canonical, {
      purpose: 'CONTACT',
    }).canonical;
    return `${normalized.slice(0, 2)}${'*'.repeat(
      Math.max(normalized.length - 6, 0),
    )}${normalized.slice(-4)}`;
  }

  phonesAreEquivalent(
    left: string | null | undefined,
    right: string | null | undefined,
    context: PhoneNumberContext,
  ): boolean {
    try {
      return (
        this.normalizePhoneNumber(left, context).canonical ===
        this.normalizePhoneNumber(right, context).canonical
      );
    } catch {
      return false;
    }
  }

  private normalizeInput(input: string | null | undefined): string {
    const value = input?.normalize('NFKC').trim();
    if (!value) throw new PhoneNumberError('PHONE_REQUIRED');
    if (/\b(?:ext(?:ension)?|x)\b|#/iu.test(value)) {
      throw new PhoneNumberError('PHONE_EXTENSION_NOT_ALLOWED');
    }
    if (!PHONE_INPUT_PATTERN.test(value)) {
      throw new PhoneNumberError('PHONE_INVALID');
    }
    return value.replace(/[\u00a0\u202f]/gu, ' ');
  }
}
