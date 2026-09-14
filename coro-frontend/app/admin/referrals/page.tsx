'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface OrganizationSummary {
  id: string;
  name: string;
  referralCode?: string | null;
  licenseType?: string;
  isActive?: boolean;
}

interface ReferralCredit {
  id: string;
  type: string;
  status: string;
  amountCents: number;
  currency: string;
  description?: string | null;
  approvedAt?: string | null;
  appliedAt?: string | null;
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
  rejectedAt?: string | null;
  cancelledAt?: string | null;

  conversionValueCents?: number | null;
  rewardAmountCents: number;
  currency: string;

  prospectCompanyName?: string | null;
  prospectFirstName?: string | null;
  prospectLastName?: string | null;
  prospectEmail?: string | null;

  rejectionReason?: string | null;
  adminNotes?: string | null;

  createdAt: string;
  updatedAt: string;

  referrerOrganization: OrganizationSummary;
  referredOrganization?: OrganizationSummary | null;

  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;

  credits: ReferralCredit[];
}

interface ReferralSummary {
  total: number;
  pending: number;
  registered: number;
  qualified: number;
  converted: number;
  rewarded: number;
  rejected: number;
  cancelled: number;
  totalConversionValueCents: number;
  totalRewardedCents: number;
}

interface ReferralResponse {
  summary: ReferralSummary;
  referrals: Referral[];
}

const statusStyles: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: 'En attente',
    bg: '#F8F9FA',
    text: '#6C757D',
    border: '#DEE2E6',
  },

  REGISTERED: {
    label: 'Inscrite',
    bg: '#EBF5FB',
    text: '#2980B9',
    border: '#AED6F1',
  },

  QUALIFIED: {
    label: 'Qualifiée',
    bg: '#FEF9E7',
    text: '#B7950B',
    border: '#F7DC6F',
  },

  CONVERTED: {
    label: 'Convertie',
    bg: '#E8F8F5',
    text: '#148F77',
    border: '#A3E4D7',
  },

  REWARDED: {
    label: 'Récompensée',
    bg: '#EAFAF1',
    text: '#27AE60',
    border: '#A9DFBF',
  },

  REJECTED: {
    label: 'Rejetée',
    bg: '#FDEDEC',
    text: '#C0392B',
    border: '#F1948A',
  },

  CANCELLED: {
    label: 'Annulée',
    bg: '#F4F6F7',
    text: '#7F8C8D',
    border: '#D5D8DC',
  },
};

const sourceLabels: Record<string, string> = {
  LINK: 'Lien de recommandation',
  CODE: 'Code communiqué',
  EMAIL: 'Courriel',
  MANUAL: 'Saisie manuelle',
  ADMIN: 'Attribution administrative',
};

export default function ReferralsAdminPage() {
  const router = useRouter();

  const {
    user,
    isAuthenticated,
    initAuth,
  } = useAuthStore();

  const [data, setData] =
    useState<ReferralResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState<string | null>(null);

  const [error, setError] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('ALL');

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }

      fetchData();
    } else {
      const token =
        localStorage.getItem('coro_token');

      if (!token) {
        router.push('/login');
      }
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      setError('');

      const res =
        await api.get('/referrals/admin');

      setData(res.data);
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'Impossible de charger les recommandations.',
      );
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (
    referralId: string,
    callback: () => Promise<any>,
  ) => {
    try {
      setActionLoading(referralId);
      setError('');

      await callback();

      await fetchData();
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'Une erreur est survenue.',
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleQualify = (
    referral: Referral,
  ) => {
    runAction(
      referral.id,
      () =>
        api.patch(
          `/referrals/admin/${referral.id}/qualify`,
        ),
    );
  };

  const handleConvert = (
    referral: Referral,
  ) => {
    const value = window.prompt(
      'Valeur du nouveau client en dollars CAD.\n\nExemple : 1500',
      referral.conversionValueCents
        ? (
            referral.conversionValueCents /
            100
          ).toString()
        : '',
    );

    if (value === null) {
      return;
    }

    const normalized =
      value.trim().replace(',', '.');

    let conversionValueCents:
      | number
      | undefined;

    if (normalized !== '') {
      const amount =
        Number(normalized);

      if (
        Number.isNaN(amount) ||
        amount < 0
      ) {
        window.alert(
          'Le montant saisi est invalide.',
        );

        return;
      }

      conversionValueCents =
        Math.round(amount * 100);
    }

    runAction(
      referral.id,
      () =>
        api.patch(
          `/referrals/admin/${referral.id}/convert`,
          {
            conversionValueCents,
          },
        ),
    );
  };

  const handleReward = (
    referral: Referral,
  ) => {
    const reward =
      formatMoney(
        referral.rewardAmountCents,
        referral.currency,
      );

    const confirmed =
      window.confirm(
        `Approuver un crédit de ${reward} pour ${referral.referrerOrganization.name} ?\n\nCette action marquera la recommandation comme récompensée.`,
      );

    if (!confirmed) {
      return;
    }

    runAction(
      referral.id,
      () =>
        api.post(
          `/referrals/admin/${referral.id}/reward`,
        ),
    );
  };

  const handleReject = (
    referral: Referral,
  ) => {
    const reason =
      window.prompt(
        'Motif du rejet :',
        referral.rejectionReason || '',
      );

    if (reason === null) {
      return;
    }

    runAction(
      referral.id,
      () =>
        api.patch(
          `/referrals/admin/${referral.id}/reject`,
          {
            reason:
              reason.trim() ||
              undefined,
          },
        ),
    );
  };

  const handleCancel = (
    referral: Referral,
  ) => {
    const confirmed =
      window.confirm(
        'Annuler cette recommandation ?',
      );

    if (!confirmed) {
      return;
    }

    runAction(
      referral.id,
      () =>
        api.patch(
          `/referrals/admin/${referral.id}/cancel`,
          {},
        ),
    );
  };

  const referrals =
    data?.referrals ?? [];

  const filteredReferrals =
    statusFilter === 'ALL'
      ? referrals
      : referrals.filter(
          referral =>
            referral.status ===
            statusFilter,
        );

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p
            className="text-sm animate-pulse"
            style={{
              color: '#ADB5BD',
            }}
          >
            Chargement...
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2
            className="text-2xl font-semibold"
            style={{
              color: '#2C3E50',
            }}
          >
            Programme de recommandation
          </h2>

          <p
            className="text-sm mt-1"
            style={{
              color: '#6C757D',
            }}
          >
            Suivi des recommandations,
            conversions et crédits CORO.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="w-full sm:w-auto text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{
            backgroundColor: '#FFFFFF',
            color: '#495057',
            border:
              '1px solid #DEE2E6',
          }}
        >
          Actualiser
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div
          className="rounded p-3 mb-6 text-sm"
          style={{
            backgroundColor: '#FDEDEC',
            color: '#C0392B',
            border:
              '1px solid #F1948A',
          }}
        >
          {error}
        </div>
      )}

      {/* Statistiques principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Recommandations"
          value={
            data?.summary.total ?? 0
          }
        />

        <StatCard
          label="Qualifiées"
          value={
            data?.summary.qualified ?? 0
          }
        />

        <StatCard
          label="Converties"
          value={
            data?.summary.converted ?? 0
          }
        />

        <StatCard
          label="Récompensées"
          value={
            data?.summary.rewarded ?? 0
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <StatCard
          label="Valeur clients convertis"
          value={formatMoney(
            data?.summary
              .totalConversionValueCents ??
              0,
            'CAD',
          )}
        />

        <StatCard
          label="Crédits accordés"
          value={formatMoney(
            data?.summary
              .totalRewardedCents ??
              0,
            'CAD',
          )}
        />
      </div>

      {/* Filtre */}
      <div
        className="rounded-md p-4 mb-5"
        style={{
          backgroundColor: '#FFFFFF',
          border:
            '1px solid #E9ECEF',
          boxShadow:
            '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span
            className="text-sm font-medium"
            style={{
              color: '#495057',
            }}
          >
            Statut
          </span>

          <select
            value={statusFilter}
            onChange={e =>
              setStatusFilter(
                e.target.value,
              )
            }
            className="w-full sm:w-auto rounded px-3 py-2 text-sm focus:outline-none"
            style={{
              backgroundColor:
                '#FFFFFF',
              color: '#2C3E50',
              border:
                '1px solid #CED4DA',
            }}
          >
            <option value="ALL">
              Tous
            </option>

            <option value="PENDING">
              En attente
            </option>

            <option value="REGISTERED">
              Inscrites
            </option>

            <option value="QUALIFIED">
              Qualifiées
            </option>

            <option value="CONVERTED">
              Converties
            </option>

            <option value="REWARDED">
              Récompensées
            </option>

            <option value="REJECTED">
              Rejetées
            </option>

            <option value="CANCELLED">
              Annulées
            </option>
          </select>

          <span
            className="text-xs"
            style={{
              color: '#ADB5BD',
            }}
          >
            {filteredReferrals.length}{' '}
            résultat
            {filteredReferrals.length !==
            1
              ? 's'
              : ''}
          </span>
        </div>
      </div>

      {/* Recommandations */}
      <div className="grid gap-4">
        {filteredReferrals.map(
          referral => {
            const style =
              statusStyles[
                referral.status
              ] ??
              statusStyles.PENDING;

            const busy =
              actionLoading ===
              referral.id;

            const approvedCredit =
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
                key={referral.id}
                className="rounded-md p-5"
                style={{
                  backgroundColor:
                    '#FFFFFF',
                  border:
                    '1px solid #E9ECEF',
                  boxShadow:
                    '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* Ligne supérieure */}
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3
                        className="font-semibold"
                        style={{
                          color:
                            '#2C3E50',
                        }}
                      >
                        {
                          referral
                            .referrerOrganization
                            .name
                        }
                      </h3>

                      <span
                        style={{
                          color:
                            '#ADB5BD',
                        }}
                      >
                        →
                      </span>

                      <h3
                        className="font-semibold"
                        style={{
                          color:
                            '#2C3E50',
                        }}
                      >
                        {referral
                          .referredOrganization
                          ?.name ??
                          referral.prospectCompanyName ??
                          'Prospect'}
                      </h3>
                    </div>

                    <div className="flex flex-wrap gap-2 items-center">
                      <span
                        className="text-xs px-2 py-1 rounded font-mono"
                        style={{
                          backgroundColor:
                            '#F8F9FA',
                          color:
                            '#495057',
                          border:
                            '1px solid #E9ECEF',
                        }}
                      >
                        {
                          referral.referralCode
                        }
                      </span>

                      <span
                        className="text-xs"
                        style={{
                          color:
                            '#6C757D',
                        }}
                      >
                        {sourceLabels[
                          referral
                            .source
                        ] ??
                          referral.source}
                      </span>
                    </div>
                  </div>

                  <span
                    className="text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap"
                    style={{
                      backgroundColor:
                        style.bg,
                      color:
                        style.text,
                      border: `1px solid ${style.border}`,
                    }}
                  >
                    {style.label}
                  </span>
                </div>

                {/* Informations */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                  <InfoBox
                    label="Premier contact"
                    value={formatDate(
                      referral.firstTouchAt,
                    )}
                  />

                  <InfoBox
                    label="Inscription"
                    value={
                      referral.registeredAt
                        ? formatDate(
                            referral.registeredAt,
                          )
                        : '—'
                    }
                  />

                  <InfoBox
                    label="Valeur client"
                    value={
                      referral.conversionValueCents !==
                        null &&
                      referral.conversionValueCents !==
                        undefined
                        ? formatMoney(
                            referral.conversionValueCents,
                            referral.currency,
                          )
                        : '—'
                    }
                  />

                  <InfoBox
                    label="Crédit prévu"
                    value={formatMoney(
                      referral.rewardAmountCents,
                      referral.currency,
                    )}
                  />
                </div>

                {/* Crédit attribué */}
                {approvedCredit && (
                  <div
                    className="rounded-md p-3 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    style={{
                      backgroundColor:
                        '#EAFAF1',
                      border:
                        '1px solid #A9DFBF',
                    }}
                  >
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{
                          color:
                            '#27AE60',
                        }}
                      >
                        Crédit CORO
                        approuvé
                      </p>

                      <p
                        className="text-xs mt-0.5"
                        style={{
                          color:
                            '#6C757D',
                        }}
                      >
                        {
                          approvedCredit.description
                        }
                      </p>
                    </div>

                    <span
                      className="font-semibold"
                      style={{
                        color:
                          '#27AE60',
                      }}
                    >
                      {formatMoney(
                        approvedCredit.amountCents,
                        approvedCredit.currency,
                      )}
                    </span>
                  </div>
                )}

                {/* Motif rejet */}
                {referral.rejectionReason && (
                  <div
                    className="rounded-md p-3 mb-4 text-sm"
                    style={{
                      backgroundColor:
                        '#FDEDEC',
                      color:
                        '#C0392B',
                      border:
                        '1px solid #F1948A',
                    }}
                  >
                    <strong>
                      Motif du rejet :
                    </strong>{' '}
                    {
                      referral.rejectionReason
                    }
                  </div>
                )}

                {/* Actions */}
                <div
                  className="flex flex-wrap gap-2 pt-4"
                  style={{
                    borderTop:
                      '1px solid #F1F3F5',
                  }}
                >
                  {[
                    'PENDING',
                    'REGISTERED',
                  ].includes(
                    referral.status,
                  ) && (
                    <ActionButton
                      disabled={busy}
                      onClick={() =>
                        handleQualify(
                          referral,
                        )
                      }
                    >
                      Qualifier
                    </ActionButton>
                  )}

                  {[
                    'REGISTERED',
                    'QUALIFIED',
                  ].includes(
                    referral.status,
                  ) && (
                    <ActionButton
                      disabled={busy}
                      onClick={() =>
                        handleConvert(
                          referral,
                        )
                      }
                    >
                      Convertir
                    </ActionButton>
                  )}

                  {referral.status ===
                    'CONVERTED' && (
                    <ActionButton
                      disabled={busy}
                      primary
                      onClick={() =>
                        handleReward(
                          referral,
                        )
                      }
                    >
                      Approuver le crédit
                    </ActionButton>
                  )}

                  {![
                    'REWARDED',
                    'REJECTED',
                  ].includes(
                    referral.status,
                  ) && (
                    <ActionButton
                      disabled={busy}
                      danger
                      onClick={() =>
                        handleReject(
                          referral,
                        )
                      }
                    >
                      Rejeter
                    </ActionButton>
                  )}

                  {![
                    'REWARDED',
                    'CANCELLED',
                  ].includes(
                    referral.status,
                  ) && (
                    <ActionButton
                      disabled={busy}
                      onClick={() =>
                        handleCancel(
                          referral,
                        )
                      }
                    >
                      Annuler
                    </ActionButton>
                  )}

                  {busy && (
                    <span
                      className="text-xs px-2 py-2"
                      style={{
                        color:
                          '#ADB5BD',
                      }}
                    >
                      Traitement...
                    </span>
                  )}
                </div>
              </div>
            );
          },
        )}

        {filteredReferrals.length ===
          0 && (
          <div
            className="rounded-md p-10 text-center"
            style={{
              backgroundColor:
                '#FFFFFF',
              border:
                '1px solid #E9ECEF',
            }}
          >
            <p
              className="text-sm"
              style={{
                color: '#ADB5BD',
              }}
            >
              Aucune recommandation
              pour ce statut.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      className="rounded-md p-4"
      style={{
        backgroundColor: '#FFFFFF',
        border:
          '1px solid #E9ECEF',
        boxShadow:
          '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      <p
        className="text-xs mb-1"
        style={{
          color: '#6C757D',
        }}
      >
        {label}
      </p>

      <p
        className="text-xl font-semibold"
        style={{
          color: '#2C3E50',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className="rounded px-3 py-2.5"
      style={{
        backgroundColor: '#F8F9FA',
      }}
    >
      <p
        className="text-xs mb-1"
        style={{
          color: '#ADB5BD',
        }}
      >
        {label}
      </p>

      <p
        className="text-sm font-medium"
        style={{
          color: '#495057',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  let backgroundColor =
    '#FFFFFF';

  let color =
    '#495057';

  let border =
    '#DEE2E6';

  if (primary) {
    backgroundColor =
      '#C0392B';

    color =
      '#FFFFFF';

    border =
      '#C0392B';
  }

  if (danger) {
    backgroundColor =
      '#FFFFFF';

    color =
      '#C0392B';

    border =
      '#F1948A';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-medium px-3 py-2 rounded transition-opacity"
      style={{
        backgroundColor,
        color,
        border: `1px solid ${border}`,
        opacity:
          disabled ? 0.5 : 1,
        cursor:
          disabled
            ? 'not-allowed'
            : 'pointer',
      }}
    >
      {children}
    </button>
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
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(value));
}