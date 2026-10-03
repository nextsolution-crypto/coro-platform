import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PhoneNumberService } from '../common/phone/phone-number.service';

@Injectable()
export class PopulationSmsSuppressionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly phoneNumbers: PhoneNumberService,
  ) {}

  canonicalize(phone: string): string {
    return this.phoneNumbers.normalizePhoneNumber(phone, {
      defaultCountry: 'CA',
      purpose: 'SMS',
    }).canonical;
  }

  async isSuppressed(phoneCanonical: string): Promise<boolean> {
    const suppression = await this.prisma.populationSmsSuppression.findUnique({
      where: { phoneCanonical },
      select: { id: true },
    });
    return Boolean(suppression);
  }
}
