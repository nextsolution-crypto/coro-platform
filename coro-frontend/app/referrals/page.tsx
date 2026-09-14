'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { PageTitle } from '@/components/ui/Typography';

interface ReferralCredit {
  id: string;
  referralId?: string | null;
  type: string;
  status: string;
  amountCents: number;
  currency: string;
  description?: string | null;
  approvedAt?: string | null;
  appliedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

interface Referral {
  id: string;
  referralCode: string;
  source: string;
  status: string;

  firstTouchAt: string;
  expiresAt?: string | null;

  registeredAt?: string | null;
  qualifiedAt?: string | null;
  convertedAt?: string | null;
  rewardedAt?: string | null;

  conversionValueCents?: number | null;
  rewardAmountCents: number;
  currency: string;

  prospectCompanyName?: string | null;

  referredOrganization?: {
    id: string;
    name: string;
    licenseType: string;
    isActive: boolean;
  } | null;

  credits: ReferralCredit[];

  createdAt: string;
  updatedAt: string;
}

interface ReferralProgramResponse {
  organization: {
    id: string;
    name: string;
    referralCode?: string | null;
    licenseType: string;
    isActive: boolean;
  };

  summary: {
    total: number;
    pending: number;
    registered: number;
    qualified: number;
    converted: number;
    rewarded: number;
    rejected: number;
    cancelled: number;

    totalConversionValueCents: number;
    pendingCreditCents: number;
    approvedCreditCents: number;
    appliedCreditCents: number;
  };

  referrals: Referral[];
  credits: ReferralCredit[];
}

const statusConfig: Record<
  string,
  {
    label: string;
    bg: string;
    color: string;
    border: string;
  }
> = {
  PENDING: {
    label: 'En attente',
    bg: '#F8F9FA',
    color: '#6C757D',
    border: '#DEE2E6',
  },

  REGISTERED: {
    label: 'Inscrite',
    bg: '#EBF5FB',
    color: '#2980B9',
    border: '#AED6F1',
  },

  QUALIFIED: {
    label: 'Qualifiée',
    bg: '#FEF9E7',
    color: '#F39C12',
    border: '#FAD7A0',
  },

  CONVERTED: {
    label: 'Convertie',
    bg: '#E8F8F5',
    color: '#148F77',
    border: '#A3E4D7',
  },

  REWARDED: {
    label: 'Récompensée',
    bg: '#EAFAF1',
    color: '#27AE60',
    border: '#A9DFBF',
  },

  REJECTED: {
    label: 'Rejetée',
    bg: '#FDEDEC',
    color: '#C0392B',
    border: '#F1948A',
  },

  CANCELLED: {
    label: 'Annulée',
    bg: '#F4F6F7',
    color: '#7F8C8D',
    border: '#D5D8DC',
  },
};

const sourceLabels: Record<string, string> = {
  LINK: 'Lien',
  CODE: 'Code',
  EMAIL: 'Courriel',
  MANUAL: 'Manuelle',
  ADMIN: 'Administrative',
};

export default function ReferralsPage() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    refreshUser,
  } = useAuthStore();

  const [data, setData] =
    useState<ReferralProgramResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [copied, setCopied] =
    useState<'code' | 'link' | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    refreshUser();
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    if (
      user &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPER_ADMIN'
    ) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      const res =
        await api.get('/referrals/me');

      setData(res.data);
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'Impossible de charger le programme de recommandation.',
      );
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (
    value: string,
    type: 'code' | 'link',
  ) => {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(type);

      setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch {
      setError(
        'Impossible de copier automatiquement. Veuillez sélectionner le texte manuellement.',
      );
    }
  };

  if (!user) {
    return null;
  }

  const referralCode =
    data?.organization.referralCode || '';

  const referralLink =
    referralCode
      ? `https://getcoro.io/?ref=${encodeURIComponent(referralCode)}`
      : '';

  const availableCreditCents =
    data?.summary.approvedCreditCents ?? 0;

  const appliedCreditCents =
    data?.summary.appliedCreditCents ?? 0;

  const referrals =
    data?.referrals ?? [];

  return (
    <AppLayout>
      {/* En-tête */}
      <div className="mb-7">
        <PageTitle
          subtitle="Recommandez CORO à une organisation et recevez un crédit lorsque celle-ci devient cliente admissible."
        >
          Programme de recommandation
        </PageTitle>
      </div>

      {error && (
        <div
          className="rounded-md p-4 mb-6 text-sm"
          style={{
            backgroundColor: '#FDEDEC',
            color: '#C0392B',
            border: '1px solid #F1948A',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div
          className="rounded-md py-12 text-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p
            className="text-sm animate-pulse"
            style={{ color: '#ADB5BD' }}
          >
            Chargement...
          </p>
        </div>
      ) : !data ? (
        <div
          className="rounded-md py-12 text-center"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p
            className="text-sm"
            style={{ color: '#ADB5BD' }}
          >
            Les informations du programme ne sont pas disponibles.
          </p>
        </div>
      ) : (
        <>
          {/* Carte principale de recommandation */}
          <div
            className="rounded-md overflow-hidden mb-6"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
            }}
          >
            <div
              className="px-4 sm:px-6 py-5"
              style={{
                backgroundColor: '#2C3E50',
              }}
            >
              <p
                className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{
                  color: '#BDC3C7',
                }}
              >
                Votre lien personnel
              </p>

              <h3
                className="text-lg sm:text-xl font-bold"
                style={{
                  color: '#FFFFFF',
                }}
              >
                Recommandez CORO
              </h3>

              <p
                className="text-sm mt-1 max-w-2xl"
                style={{
                  color: '#ECF0F1',
                }}
              >
                Partagez votre lien ou votre code avec une organisation intéressée par CORO.
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {!referralCode ? (
                <div
                  className="rounded-md p-4 text-sm"
                  style={{
                    backgroundColor: '#FEF9E7',
                    color: '#B7950B',
                    border: '1px solid #F7DC6F',
                  }}
                >
                  Aucun code de recommandation n'est actuellement associé à votre organisation.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {/* Lien */}
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{
                        color: '#6C757D',
                      }}
                    >
                      Lien de recommandation
                    </p>

                    <div
                      className="flex flex-col sm:flex-row gap-2 rounded-md p-3"
                      style={{
                        backgroundColor: '#F8F9FA',
                        border: '1px solid #DEE2E6',
                      }}
                    >
                      <div
                        className="flex-1 min-w-0 text-sm break-all"
                        style={{
                          color: '#2C3E50',
                        }}
                      >
                        {referralLink}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            referralLink,
                            'link',
                          )
                        }
                        className="w-full sm:w-auto px-3 py-2 rounded text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor:
                            copied === 'link'
                              ? '#27AE60'
                              : '#C0392B',
                          color: '#FFFFFF',
                          border: 'none',
                        }}
                      >
                        {copied === 'link'
                          ? '✓ Copié'
                          : 'Copier le lien'}
                      </button>
                    </div>
                  </div>

                  {/* Code */}
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wide mb-2"
                      style={{
                        color: '#6C757D',
                      }}
                    >
                      Code de recommandation
                    </p>

                    <div
                      className="flex items-center justify-between gap-3 rounded-md p-3"
                      style={{
                        backgroundColor: '#F8F9FA',
                        border: '1px solid #DEE2E6',
                      }}
                    >
                      <span
                        className="text-lg font-bold font-mono tracking-wider"
                        style={{
                          color: '#2C3E50',
                        }}
                      >
                        {referralCode}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            referralCode,
                            'code',
                          )
                        }
                        className="px-3 py-2 rounded text-xs font-semibold"
                        style={{
                          backgroundColor:
                            copied === 'code'
                              ? '#27AE60'
                              : '#FFFFFF',
                          color:
                            copied === 'code'
                              ? '#FFFFFF'
                              : '#495057',
                          border:
                            copied === 'code'
                              ? '1px solid #27AE60'
                              : '1px solid #CED4DA',
                        }}
                      >
                        {copied === 'code'
                          ? '✓ Copié'
                          : 'Copier'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div
                className="mt-5 pt-4"
                style={{
                  borderTop: '1px solid #E9ECEF',
                }}
              >
                <p
                  className="text-xs leading-5"
                  style={{
                    color: '#6C757D',
                  }}
                >
                  Lorsqu'une organisation admissible devient cliente CORO grâce à votre recommandation, un crédit de{' '}
                  <strong style={{ color: '#2C3E50' }}>
                    250,00 $
                  </strong>{' '}
                  peut être accordé à votre compte après validation par CORO.
                </p>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <KpiCard
              label="Recommandations"
              value={data.summary.total}
              color="#2C3E50"
            />

            <KpiCard
              label="En cours"
              value={
                data.summary.pending +
                data.summary.registered +
                data.summary.qualified
              }
              color="#2980B9"
            />

            <KpiCard
              label="Converties"
              value={
                data.summary.converted +
                data.summary.rewarded
              }
              color="#148F77"
            />

            <KpiCard
              label="Récompensées"
              value={data.summary.rewarded}
              color="#27AE60"
            />
          </div>

          {/* Crédits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div
              className="rounded-md p-5"
              style={{
                backgroundColor: '#EAFAF1',
                border: '1px solid #A9DFBF',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{
                  color: '#27AE60',
                }}
              >
                Crédits disponibles
              </p>

              <p
                className="text-3xl font-black"
                style={{
                  color: '#1E8449',
                }}
              >
                {formatMoney(
                  availableCreditCents,
                )}
              </p>

              <p
                className="text-xs mt-2"
                style={{
                  color: '#6C757D',
                }}
              >
                Crédits approuvés par CORO et disponibles pour une utilisation future.
              </p>
            </div>

            <div
              className="rounded-md p-5"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E9ECEF',
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{
                  color: '#6C757D',
                }}
              >
                Crédits déjà appliqués
              </p>

              <p
                className="text-3xl font-black"
                style={{
                  color: '#2C3E50',
                }}
              >
                {formatMoney(
                  appliedCreditCents,
                )}
              </p>

              <p
                className="text-xs mt-2"
                style={{
                  color: '#ADB5BD',
                }}
              >
                Historique des crédits utilisés sur votre compte CORO.
              </p>
            </div>
          </div>

          {/* Fonctionnement */}
          <div
            className="rounded-md mb-8"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
            }}
          >
            <div
              className="px-4 sm:px-5 py-4"
              style={{
                borderBottom: '1px solid #E9ECEF',
              }}
            >
              <h3
                className="font-semibold text-sm"
                style={{
                  color: '#2C3E50',
                }}
              >
                Comment ça fonctionne
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3">
              <Step
                number="1"
                title="Partagez"
                text="Envoyez votre lien ou votre code de recommandation à une organisation."
              />

              <Step
                number="2"
                title="L'organisation devient cliente"
                text="CORO associe la nouvelle organisation à votre recommandation."
              />

              <Step
                number="3"
                title="Recevez votre crédit"
                text="Après validation de l'admissibilité, le crédit est ajouté à votre compte."
                last
              />
            </div>
          </div>

          {/* Historique */}
          <div
            className="rounded-md overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E9ECEF',
            }}
          >
            <div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-4"
              style={{
                borderBottom: '1px solid #E9ECEF',
              }}
            >
              <div>
                <h3
                  className="font-semibold text-sm"
                  style={{
                    color: '#2C3E50',
                  }}
                >
                  Mes recommandations
                </h3>

                <p
                  className="text-xs mt-0.5"
                  style={{
                    color: '#ADB5BD',
                  }}
                >
                  Suivi des organisations recommandées à CORO.
                </p>
              </div>

              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: '#F8F9FA',
                  color: '#6C757D',
                  border: '1px solid #DEE2E6',
                }}
              >
                {referrals.length}{' '}
                recommandation
                {referrals.length !== 1
                  ? 's'
                  : ''}
              </span>
            </div>

            {referrals.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p
                  className="text-2xl mb-2"
                  aria-hidden
                >
                  🎁
                </p>

                <p
                  className="text-sm font-medium"
                  style={{
                    color: '#2C3E50',
                  }}
                >
                  Aucune recommandation pour le moment
                </p>

                <p
                  className="text-xs mt-1"
                  style={{
                    color: '#ADB5BD',
                  }}
                >
                  Partagez votre lien CORO pour commencer.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile */}
                <div className="md:hidden">
                  {referrals.map(
                    (referral, index) => (
                      <ReferralMobileCard
                        key={referral.id}
                        referral={referral}
                        last={
                          index ===
                          referrals.length - 1
                        }
                      />
                    ),
                  )}
                </div>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table
                    className="w-full text-sm"
                    style={{
                      borderCollapse:
                        'collapse',
                    }}
                  >
                    <thead>
                      <tr
                        style={{
                          backgroundColor:
                            '#F8F9FA',
                        }}
                      >
                        {[
                          'Organisation',
                          'Premier contact',
                          'Source',
                          'Statut',
                          'Crédit',
                        ].map(col => (
                          <th
                            key={col}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                            style={{
                              color:
                                '#ADB5BD',
                              borderBottom:
                                '1px solid #E9ECEF',
                            }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {referrals.map(
                        (
                          referral,
                          index,
                        ) => {
                          const status =
                            statusConfig[
                              referral
                                .status
                            ] ||
                            statusConfig
                              .PENDING;

                          const rewardCredit =
                            referral.credits.find(
                              credit =>
                                credit.type ===
                                  'REFERRAL_REWARD' &&
                                [
                                  'APPROVED',
                                  'APPLIED',
                                ].includes(
                                  credit.status,
                                ),
                            );

                          return (
                            <tr
                              key={
                                referral.id
                              }
                              style={{
                                borderBottom:
                                  index <
                                  referrals.length -
                                    1
                                    ? '1px solid #F8F9FA'
                                    : 'none',
                              }}
                            >
                              <td className="px-4 py-4">
                                <p
                                  className="font-medium"
                                  style={{
                                    color:
                                      '#2C3E50',
                                  }}
                                >
                                  {referral
                                    .referredOrganization
                                    ?.name ||
                                    referral.prospectCompanyName ||
                                    'Organisation référée'}
                                </p>
                              </td>

                              <td
                                className="px-4 py-4 text-xs"
                                style={{
                                  color:
                                    '#6C757D',
                                }}
                              >
                                {formatDate(
                                  referral.firstTouchAt,
                                )}
                              </td>

                              <td
                                className="px-4 py-4 text-xs"
                                style={{
                                  color:
                                    '#6C757D',
                                }}
                              >
                                {sourceLabels[
                                  referral
                                    .source
                                ] ||
                                  referral.source}
                              </td>

                              <td className="px-4 py-4">
                                <span
                                  className="text-xs px-2 py-1 rounded-full font-medium"
                                  style={{
                                    backgroundColor:
                                      status.bg,
                                    color:
                                      status.color,
                                    border: `1px solid ${status.border}`,
                                  }}
                                >
                                  {
                                    status.label
                                  }
                                </span>
                              </td>

                              <td className="px-4 py-4">
                                {rewardCredit ? (
                                  <span
                                    className="text-sm font-bold"
                                    style={{
                                      color:
                                        '#27AE60',
                                    }}
                                  >
                                    {formatMoney(
                                      rewardCredit.amountCents,
                                      rewardCredit.currency,
                                    )}
                                  </span>
                                ) : referral.status ===
                                  'CONVERTED' ? (
                                  <span
                                    className="text-xs"
                                    style={{
                                      color:
                                        '#F39C12',
                                    }}
                                  >
                                    En validation
                                  </span>
                                ) : (
                                  <span
                                    className="text-xs"
                                    style={{
                                      color:
                                        '#ADB5BD',
                                    }}
                                  >
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        },
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Conditions */}
          <p
            className="text-xs mt-4 leading-5"
            style={{
              color: '#ADB5BD',
            }}
          >
            Les recommandations sont soumises aux conditions du programme CORO. Une recommandation doit être admissible et validée avant l'attribution d'un crédit. Les crédits n'ont aucune valeur monétaire et sont applicables uniquement aux services CORO selon les modalités en vigueur.
          </p>
        </>
      )}
    </AppLayout>
  );
}

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="rounded-md p-4 sm:p-5"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E9ECEF',
      }}
    >
      <p
        className="text-xs font-medium mb-1"
        style={{
          color: '#6C757D',
        }}
      >
        {label}
      </p>

      <p
        className="text-3xl font-black"
        style={{
          color,
        }}
      >
        {value}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
  last,
}: {
  number: string;
  title: string;
  text: string;
  last?: boolean;
}) {
  return (
    <div
      className="p-5"
      style={{
        borderRight: last
          ? 'none'
          : '1px solid #F1F3F5',
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white mb-3"
        style={{
          backgroundColor: '#C0392B',
        }}
      >
        {number}
      </div>

      <p
        className="text-sm font-semibold mb-1"
        style={{
          color: '#2C3E50',
        }}
      >
        {title}
      </p>

      <p
        className="text-xs leading-5"
        style={{
          color: '#6C757D',
        }}
      >
        {text}
      </p>
    </div>
  );
}

function ReferralMobileCard({
  referral,
  last,
}: {
  referral: Referral;
  last: boolean;
}) {
  const status =
    statusConfig[referral.status] ||
    statusConfig.PENDING;

  const rewardCredit =
    referral.credits.find(
      credit =>
        credit.type ===
          'REFERRAL_REWARD' &&
        [
          'APPROVED',
          'APPLIED',
        ].includes(
          credit.status,
        ),
    );

  return (
    <div
      className="p-4"
      style={{
        borderBottom: last
          ? 'none'
          : '1px solid #F8F9FA',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p
            className="text-sm font-semibold break-words"
            style={{
              color: '#2C3E50',
            }}
          >
            {referral.referredOrganization
              ?.name ||
              referral.prospectCompanyName ||
              'Organisation référée'}
          </p>

          <p
            className="text-xs mt-1"
            style={{
              color: '#ADB5BD',
            }}
          >
            {formatDate(
              referral.firstTouchAt,
            )}
          </p>
        </div>

        <span
          className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
          style={{
            backgroundColor: status.bg,
            color: status.color,
            border: `1px solid ${status.border}`,
          }}
        >
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span
          className="text-xs"
          style={{
            color: '#6C757D',
          }}
        >
          {sourceLabels[
            referral.source
          ] || referral.source}
        </span>

        {rewardCredit ? (
          <span
            className="text-sm font-bold"
            style={{
              color: '#27AE60',
            }}
          >
            {formatMoney(
              rewardCredit.amountCents,
              rewardCredit.currency,
            )}
          </span>
        ) : referral.status ===
          'CONVERTED' ? (
          <span
            className="text-xs font-medium"
            style={{
              color: '#F39C12',
            }}
          >
            Crédit en validation
          </span>
        ) : null}
      </div>
    </div>
  );
}

function formatMoney(
  cents: number,
  currency = 'CAD',
) {
  return new Intl.NumberFormat(
    'fr-CA',
    {
      style: 'currency',
      currency,
    },
  ).format(cents / 100);
}

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    'fr-CA',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  ).format(new Date(value));
}