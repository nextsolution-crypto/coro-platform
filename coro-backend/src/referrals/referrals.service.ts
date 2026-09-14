import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Retourne toutes les recommandations avec
   * les organisations impliquées et les crédits.
   */
    async findMyReferralProgram(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
        referralCode: true,
        licenseType: true,
        isActive: true,

        referralsSent: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            referralCode: true,
            source: true,
            status: true,

            firstTouchAt: true,
            expiresAt: true,

            registeredAt: true,
            qualifiedAt: true,
            convertedAt: true,
            rewardedAt: true,
            rejectedAt: true,
            cancelledAt: true,

            conversionValueCents: true,
            rewardAmountCents: true,
            currency: true,

            prospectCompanyName: true,
            prospectFirstName: true,
            prospectLastName: true,
            prospectEmail: true,

            createdAt: true,
            updatedAt: true,

            referredOrganization: {
              select: {
                id: true,
                name: true,
                licenseType: true,
                isActive: true,
              },
            },

            credits: {
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                type: true,
                status: true,
                amountCents: true,
                currency: true,
                description: true,
                approvedAt: true,
                appliedAt: true,
                expiresAt: true,
                createdAt: true,
              },
            },
          },
        },

        referralCredits: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            id: true,
            referralId: true,
            type: true,
            status: true,
            amountCents: true,
            currency: true,
            description: true,
            approvedAt: true,
            appliedAt: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(
        'Organisation introuvable.',
      );
    }

    const referrals = organization.referralsSent;

    const approvedCredits =
      organization.referralCredits.filter(
        credit =>
          credit.status === 'APPROVED' &&
          credit.type === 'REFERRAL_REWARD',
      );

    const appliedCredits =
      organization.referralCredits.filter(
        credit =>
          credit.status === 'APPLIED' &&
          credit.type === 'REFERRAL_REWARD',
      );

    const pendingCredits =
      organization.referralCredits.filter(
        credit =>
          credit.status === 'PENDING' &&
          credit.type === 'REFERRAL_REWARD',
      );

    const summary = {
      total: referrals.length,

      pending: referrals.filter(
        referral => referral.status === 'PENDING',
      ).length,

      registered: referrals.filter(
        referral => referral.status === 'REGISTERED',
      ).length,

      qualified: referrals.filter(
        referral => referral.status === 'QUALIFIED',
      ).length,

      converted: referrals.filter(
        referral => referral.status === 'CONVERTED',
      ).length,

      rewarded: referrals.filter(
        referral => referral.status === 'REWARDED',
      ).length,

      rejected: referrals.filter(
        referral => referral.status === 'REJECTED',
      ).length,

      cancelled: referrals.filter(
        referral => referral.status === 'CANCELLED',
      ).length,

      totalConversionValueCents:
        referrals.reduce(
          (sum, referral) =>
            sum +
            (referral.conversionValueCents ?? 0),
          0,
        ),

      pendingCreditCents:
        pendingCredits.reduce(
          (sum, credit) =>
            sum + credit.amountCents,
          0,
        ),

      approvedCreditCents:
        approvedCredits.reduce(
          (sum, credit) =>
            sum + credit.amountCents,
          0,
        ),

      appliedCreditCents:
        appliedCredits.reduce(
          (sum, credit) =>
            sum + credit.amountCents,
          0,
        ),
    };

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        referralCode: organization.referralCode,
        licenseType: organization.licenseType,
        isActive: organization.isActive,
      },

      summary,

      referrals,

      credits: organization.referralCredits,
    };
  }

  async findAllAdmin() {
    const referrals = await this.prisma.referral.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        referrerOrganization: {
          select: {
            id: true,
            name: true,
            referralCode: true,
            licenseType: true,
            isActive: true,
          },
        },

        referredOrganization: {
          select: {
            id: true,
            name: true,
            referralCode: true,
            licenseType: true,
            isActive: true,
          },
        },

        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },

        credits: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    const summary = {
      total: referrals.length,

      pending: referrals.filter(
        referral => referral.status === 'PENDING',
      ).length,

      registered: referrals.filter(
        referral => referral.status === 'REGISTERED',
      ).length,

      qualified: referrals.filter(
        referral => referral.status === 'QUALIFIED',
      ).length,

      converted: referrals.filter(
        referral => referral.status === 'CONVERTED',
      ).length,

      rewarded: referrals.filter(
        referral => referral.status === 'REWARDED',
      ).length,

      rejected: referrals.filter(
        referral => referral.status === 'REJECTED',
      ).length,

      cancelled: referrals.filter(
        referral => referral.status === 'CANCELLED',
      ).length,

      totalConversionValueCents: referrals.reduce(
        (sum, referral) =>
          sum + (referral.conversionValueCents ?? 0),
        0,
      ),

      totalRewardedCents: referrals
        .filter(
          referral => referral.status === 'REWARDED',
        )
        .reduce(
          (sum, referral) =>
            sum + referral.rewardAmountCents,
          0,
        ),
    };

    return {
      summary,
      referrals,
    };
  }

  /**
   * Trouve une recommandation ou retourne 404.
   */
  private async findReferralOrThrow(id: string) {
    const referral =
      await this.prisma.referral.findUnique({
        where: {
          id,
        },

        include: {
          referrerOrganization: {
            select: {
              id: true,
              name: true,
              referralCode: true,
            },
          },

          referredOrganization: {
            select: {
              id: true,
              name: true,
            },
          },

          credits: true,
        },
      });

    if (!referral) {
      throw new NotFoundException(
        'Recommandation introuvable.',
      );
    }

    return referral;
  }

  /**
   * REGISTERED / PENDING → QUALIFIED
   */
  async qualify(id: string) {
    const referral =
      await this.findReferralOrThrow(id);

    if (
      referral.status !== 'PENDING' &&
      referral.status !== 'REGISTERED'
    ) {
      throw new BadRequestException(
        `La recommandation ne peut pas être qualifiée depuis le statut ${referral.status}.`,
      );
    }

    return this.prisma.referral.update({
      where: {
        id,
      },

      data: {
        status: 'QUALIFIED',
        qualifiedAt: new Date(),
        rejectedAt: null,
        rejectionReason: null,
        cancelledAt: null,
      },

      include: {
        referrerOrganization: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },

        referredOrganization: {
          select: {
            id: true,
            name: true,
          },
        },

        credits: true,
      },
    });
  }

  /**
   * REGISTERED / QUALIFIED → CONVERTED
   */
  async convert(
    id: string,
    conversionValueCents?: number,
  ) {
    const referral =
      await this.findReferralOrThrow(id);

    if (
      referral.status !== 'REGISTERED' &&
      referral.status !== 'QUALIFIED'
    ) {
      throw new BadRequestException(
        `La recommandation ne peut pas être convertie depuis le statut ${referral.status}.`,
      );
    }

    if (
      conversionValueCents !== undefined &&
      (
        !Number.isInteger(conversionValueCents) ||
        conversionValueCents < 0
      )
    ) {
      throw new BadRequestException(
        'La valeur de conversion doit être un montant positif exprimé en cents.',
      );
    }

    return this.prisma.referral.update({
      where: {
        id,
      },

      data: {
        status: 'CONVERTED',
        convertedAt: new Date(),

        conversionValueCents:
          conversionValueCents ??
          referral.conversionValueCents,

        rejectedAt: null,
        rejectionReason: null,
        cancelledAt: null,
      },

      include: {
        referrerOrganization: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },

        referredOrganization: {
          select: {
            id: true,
            name: true,
          },
        },

        credits: true,
      },
    });
  }

  /**
   * CONVERTED → REWARDED
   *
   * Crée un crédit approuvé pour l'organisation référente.
   *
   * Le crédit est APPROVED et non APPLIED :
   * nous n'avons pas encore de moteur de facturation
   * permettant de l'appliquer automatiquement.
   */
  async reward(id: string) {
    return this.prisma.$transaction(async tx => {
      const referral =
        await tx.referral.findUnique({
          where: {
            id,
          },

          include: {
            referrerOrganization: {
              select: {
                id: true,
                name: true,
                referralCode: true,
              },
            },

            referredOrganization: {
              select: {
                id: true,
                name: true,
              },
            },

            credits: true,
          },
        });

      if (!referral) {
        throw new NotFoundException(
          'Recommandation introuvable.',
        );
      }

      if (referral.status === 'REWARDED') {
        throw new ConflictException(
          'Cette recommandation a déjà été récompensée.',
        );
      }

      if (referral.status !== 'CONVERTED') {
        throw new BadRequestException(
          `La recommandation doit être CONVERTED avant d'être récompensée. Statut actuel : ${referral.status}.`,
        );
      }

      const existingReward =
        await tx.referralCredit.findFirst({
          where: {
            referralId: referral.id,
            type: 'REFERRAL_REWARD',

            status: {
              in: [
                'PENDING',
                'APPROVED',
                'APPLIED',
              ],
            },
          },
        });

      if (existingReward) {
        throw new ConflictException(
          'Un crédit actif existe déjà pour cette recommandation.',
        );
      }

      const now = new Date();

      const credit =
        await tx.referralCredit.create({
          data: {
            organizationId:
              referral.referrerOrganizationId,

            referralId:
              referral.id,

            type:
              'REFERRAL_REWARD',

            status:
              'APPROVED',

            amountCents:
              referral.rewardAmountCents,

            currency:
              referral.currency,

            description:
              `Crédit de recommandation CORO — ${referral.referredOrganization?.name ?? referral.prospectCompanyName ?? 'nouveau client'}`,

            approvedAt:
              now,
          },
        });

      const updatedReferral =
        await tx.referral.update({
          where: {
            id: referral.id,
          },

          data: {
            status: 'REWARDED',
            rewardedAt: now,
          },

          include: {
            referrerOrganization: {
              select: {
                id: true,
                name: true,
                referralCode: true,
              },
            },

            referredOrganization: {
              select: {
                id: true,
                name: true,
              },
            },

            credits: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });

      return {
        referral: updatedReferral,
        credit,
      };
    });
  }

  /**
   * Rejette une recommandation.
   */
  async reject(
    id: string,
    reason?: string,
    adminNotes?: string,
  ) {
    const referral =
      await this.findReferralOrThrow(id);

    if (referral.status === 'REWARDED') {
      throw new BadRequestException(
        'Une recommandation déjà récompensée ne peut pas être rejetée.',
      );
    }

    if (referral.status === 'REJECTED') {
      throw new ConflictException(
        'Cette recommandation est déjà rejetée.',
      );
    }

    return this.prisma.referral.update({
      where: {
        id,
      },

      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),

        rejectionReason:
          reason?.trim() || null,

        adminNotes:
          adminNotes?.trim() ||
          referral.adminNotes,

        cancelledAt: null,
      },

      include: {
        referrerOrganization: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },

        referredOrganization: {
          select: {
            id: true,
            name: true,
          },
        },

        credits: true,
      },
    });
  }

  /**
   * Annule une recommandation.
   */
  async cancel(
    id: string,
    adminNotes?: string,
  ) {
    const referral =
      await this.findReferralOrThrow(id);

    if (referral.status === 'REWARDED') {
      throw new BadRequestException(
        'Une recommandation déjà récompensée ne peut pas être annulée directement.',
      );
    }

    if (referral.status === 'CANCELLED') {
      throw new ConflictException(
        'Cette recommandation est déjà annulée.',
      );
    }

    return this.prisma.referral.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),

        adminNotes:
          adminNotes?.trim() ||
          referral.adminNotes,
      },

      include: {
        referrerOrganization: {
          select: {
            id: true,
            name: true,
            referralCode: true,
          },
        },

        referredOrganization: {
          select: {
            id: true,
            name: true,
          },
        },

        credits: true,
      },
    });
  }
}