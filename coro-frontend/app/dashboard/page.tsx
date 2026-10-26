'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { PageTitle } from '@/components/ui/Typography';
import { useTheme } from '@/design-system/theme/ThemeProvider';
import { createPalette } from '@/design-system/glass-palette';

const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  DRAFT:       { label: 'Brouillon',   bg: '#F8F9FA', color: '#6C757D', border: '#DEE2E6' },
  IN_PROGRESS: { label: 'En cours',    bg: '#EBF5FB', color: '#2980B9', border: '#AED6F1' },
  REVIEW:      { label: 'En révision', bg: '#FEF9E7', color: '#F39C12', border: '#FAD7A0' },
  VALIDATED:   { label: 'Validé',      bg: '#EAFAF1', color: '#27AE60', border: '#A9DFBF' },
  EXPORTED:    { label: 'Exporté',     bg: '#F4ECF7', color: '#8E44AD', border: '#D2B4DE' },
  ARCHIVED:    { label: 'Archivé',     bg: '#FDEDEC', color: '#C0392B', border: '#F1948A' },
};

const activityStatusConfig: Record<string, { label: string; color: string; bg: string }> = {
  a_faire:  { label: 'À faire',  color: '#2980B9', bg: '#EBF5FB' },
  fait:     { label: 'Fait',     color: '#27AE60', bg: '#EAFAF1' },
  reporte:  { label: 'Reporté',  color: '#E67E22', bg: '#FEF9E7' },
  annule:   { label: 'Annulé',   color: '#95A5A6', bg: '#F8F9FA' },
  termine:  { label: 'Terminé',  color: '#1A5276', bg: '#D6EAF8' },
};

// Icônes des cartes KPI — affichées uniquement en mode Glass.
type KpiIconName = 'folder' | 'clock' | 'check' | 'document';

function KpiIcon({ name }: { name: KpiIconName }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'folder':
      return <svg {...common}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'check':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16 9.5" /></svg>;
    case 'document':
      return <svg {...common}><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, refreshUser } = useAuthStore();
  // Génération d'interface : 'legacy' (rendu strictement inchangé) ou 'glass'.
  const { ui } = useTheme();
  const glass = ui === 'glass';
  const p = createPalette(glass);
  const gc = glass ? ' cg-glass' : '';

  const [loading, setLoading] = useState(true);
  const [projets, setProjets] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [lateTasks, setLateTasks] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recurringToRenew, setRecurringToRenew] = useState<any[]>([]);
  const [mandateDelays, setMandateDelays] = useState<any[]>([]);
  const [activeOperatorCount, setActiveOperatorCount] = useState<number | null>(null);
  const [coreError, setCoreError] = useState(false);
  const [zoneErrors, setZoneErrors] = useState<Record<string, boolean>>({});
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
    else refreshUser();
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAll();
  }, [isAuthenticated]);

  const fetchAll = async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setCoreError(false);
    setZoneErrors({});
    try {
      const admin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
      const results = await Promise.allSettled([
        api.get('/projects?limit=200'),
        api.get('/projects/upcoming-updates'),
        admin ? api.get('/projects/pending-approval') : Promise.resolve({ data: [] }),
        api.get('/activities/recurring-to-renew'),
        api.get('/activities/upcoming'),
        api.get('/notifications/mandate-delays'),
        api.get('/projects/dashboard/late-tasks'),
        admin ? api.get('/users/organization/dashboard-summary') : Promise.resolve({ data: null }),
      ]);
      if (sequence !== requestSequence.current) return;

      const errors: Record<string, boolean> = {};
      const dataAt = (index: number, zone: string) => {
        const result = results[index];
        if (result.status === 'fulfilled') return result.value.data;
        errors[zone] = true;
        return [];
      };

      const projectsResult = results[0];
      if (projectsResult.status === 'fulfilled') {
        const data = projectsResult.value.data;
        setProjets(data?.projects || data || []);
        setLastUpdatedAt(new Date());
      } else {
        setProjets([]);
        setCoreError(true);
      }
      setUpdates(dataAt(1, 'updates') || []);
      setPendingApprovals(dataAt(2, 'approvals') || []);
      setRecurringToRenew(dataAt(3, 'recurring') || []);
      const upcoming = dataAt(4, 'upcoming') || [];
      setMandateDelays(dataAt(5, 'delays') || []);
      setLateTasks(dataAt(6, 'tasks') || []);
      const summary = dataAt(7, 'team');
      setActiveOperatorCount(summary?.activeOperatorCount ?? null);
      setUpcomingActivities(upcoming.map((a: any) => ({
        ...a,
        projectName: a.project?.name || '—',
        clientName: a.project?.client?.name || '—',
        projectId: a.projectId,
      })).slice(0, 10));
      setZoneErrors(errors);
    } catch (err) {
      if (sequence === requestSequence.current) setCoreError(true);
      console.error(err);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  };

  if (!user) return null;

  const projetsActifs = projets.filter(p => ['DRAFT', 'IN_PROGRESS'].includes(p.status)).length;
  const enRevision    = projets.filter(p => p.status === 'REVIEW').length;
  const valides       = projets.filter(p => p.status === 'VALIDATED').length;
  const projetsRecents = [...projets]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const today = new Date().toLocaleDateString('fr-CA', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // ── Compteur d'actions requises ──
  const actionsRequises = pendingApprovals.length
    + updates.filter(u => u.level === 'URGENT').length
    + recurringToRenew.length
    + lateTasks.length
    + mandateDelays.filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level)).length;

  // ── Checklist onboarding ──
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const onboardingItems = [
        { label: 'Logo de l\'organisation téléversé', done: !!(user as any).companyLogoB64, path: '/settings' },
    { label: 'Informations entreprise complètes', done: !!((user as any).companyName && (user as any).companyPhone && (user as any).companyEmail), path: '/settings' },
    { label: 'Au moins un conseiller actif dans l\'équipe', done: activeOperatorCount !== null && activeOperatorCount > 0, path: '/settings/team', unavailable: zoneErrors.team },
    { label: 'Premier client créé', done: projets.some(p => p.client), path: '/clients' },
    { label: 'Premier projet lancé', done: projets.length > 0, path: '/projects' },
  ];
  const onboardingDone = onboardingItems.filter(i => i.done).length;
  const onboardingComplete = onboardingDone === onboardingItems.length;
  const hasPartialError = Object.keys(zoneErrors).length > 0;

  const kpis = [
    { label: 'Projets actifs',    value: projetsActifs, icon: 'folder' as KpiIconName, color: p.text('#C0392B'), bg: p.bg('#FDEDEC'), path: '/projects' },
    { label: 'En révision',       value: enRevision,    icon: 'clock' as KpiIconName, color: p.text('#F39C12'), bg: p.bg('#FEF9E7'), path: '/projects' },
    { label: 'Validés',           value: valides,       icon: 'check' as KpiIconName, color: p.text('#27AE60'), bg: p.bg('#EAFAF1'), path: '/projects' },
    { label: 'Mises à jour dues', value: updates.filter(u => u.level === 'URGENT').length, icon: 'document' as KpiIconName, color: p.text('#8E44AD'), bg: p.bg('#F4ECF7'), path: '/buildings/compliance' },
  ];

  return (
    <AppLayout>
      {/* ── En-tête ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
                      <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: p.text('#ADB5BD') }}>
              {today}
            </p>
            <PageTitle
              subtitle={
                loading
                  ? 'Chargement des données du tableau de bord'
                  : zoneErrors.upcoming
                  ? 'Les activités sont temporairement indisponibles'
                  : upcomingActivities.length > 0
                  ? `${upcomingActivities.length} activité${upcomingActivities.length > 1 ? 's' : ''} prévue${upcomingActivities.length > 1 ? 's' : ''} dans les 30 prochains jours`
                  : 'Aucune activité prévue dans les 30 prochains jours'
              }
            >
              Bonjour, {user.firstName} 👋
            </PageTitle>
        </div>
        {glass && (
          <div className="hidden xl:block xl:ml-auto xl:mr-6 pl-3 self-center" style={{ borderLeft: '3px solid var(--cg-accent)' }}>
            <p className="text-sm font-semibold uppercase" style={{ color: 'var(--cg-text-primary)', letterSpacing: '0.08em' }}>Résilience opérationnelle</p>
            <p className="text-xs uppercase" style={{ color: 'var(--cg-text-secondary)', letterSpacing: '0.06em' }}>Des données réelles. Des décisions éclairées.</p>
          </div>
        )}
        <button onClick={() => router.push('/projects')}
          className={`${glass ? 'self-start' : 'w-full'} sm:w-auto text-white text-sm font-medium px-4 py-2.5 rounded flex items-center justify-center gap-2 flex-shrink-0 cg-primary-action`}
          style={{ backgroundColor: p.bg('#C0392B') }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#A93226')}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = p.bg('#C0392B')}>
          + Nouveau projet
        </button>
      </div>

      {coreError && (
        <div role="alert" className="mb-4 rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ backgroundColor: p.bg('#FDEDEC'), border: `1px solid ${p.line('#F1948A')}`, color: p.text('#922B21') }}>
          <div>
            <p className="text-sm font-bold">Données principales indisponibles</p>
            <p className="text-xs mt-1">Les compteurs et les projets ne sont pas affichés comme vides. Réessayez lorsque le service est disponible.</p>
          </div>
          <button type="button" onClick={fetchAll} className="text-sm font-semibold px-3 py-2 rounded self-start sm:self-auto"
            style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#C0392B')}` }}>
            Réessayer
          </button>
        </div>
      )}

      {!coreError && hasPartialError && (
        <div role="status" className="mb-4 rounded-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ backgroundColor: p.bg('#FEF9E7'), border: `1px solid ${p.line('#FAD7A0')}`, color: p.text('#7D6608') }}>
          <div>
            <p className="text-sm font-bold">Certaines informations sont temporairement indisponibles</p>
            <p className="text-xs mt-1">Les zones concernées affichent un état explicite; les autres données restent utilisables.</p>
          </div>
          <button type="button" onClick={fetchAll} className="text-sm font-semibold px-3 py-2 rounded self-start sm:self-auto"
            style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#F39C12')}` }}>
            Réessayer
          </button>
        </div>
      )}

      {!loading && lastUpdatedAt && !coreError && (
        <p className="text-xs mb-4" style={{ color: p.text('#6C757D') }}>
          Actualisé à {lastUpdatedAt.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {/* ── Checklist onboarding ── */}
      {isAdmin && !onboardingComplete && (
        <div className={`mb-6 rounded-md overflow-hidden${gc}`} style={{ border: `1px solid ${p.line('#AED6F1')}`, backgroundColor: p.bg('#EBF5FB') }}>
          <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ borderBottom: `1px solid ${p.line('#AED6F1')}` }}>
            <div className="flex items-center gap-3 min-w-0">
              <span style={{ fontSize: 20 }}>🚀</span>
              <div>
                <p className="text-sm font-bold" style={{ color: p.text('#1A5276') }}>Configuration de votre organisation</p>
                <p className="text-xs" style={{ color: p.text('#2980B9') }}>{onboardingDone} sur {onboardingItems.length} étapes complétées</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="flex-1 sm:flex-none sm:w-32 h-2 rounded-full" style={{ backgroundColor: p.bg('#AED6F1') }}>
                <div className="h-2 rounded-full transition-all" style={{ width: `${(onboardingDone / onboardingItems.length) * 100}%`, backgroundColor: p.bg('#2980B9') }} />
              </div>
              <span className="text-sm font-bold" style={{ color: p.text('#1A5276') }}>{Math.round((onboardingDone / onboardingItems.length) * 100)}%</span>
            </div>
          </div>
          <div className="px-4 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {onboardingItems.map((item, i) => (
              <button key={i} type="button" disabled={item.done || item.unavailable}
                onClick={() => router.push(item.path)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left w-full disabled:cursor-default"
                style={{ backgroundColor: item.done ? p.bg('#EAFAF1') : p.bg('#FFFFFF'), border: `1px solid ${item.done ? p.line('#A9DFBF') : p.line('#DEE2E6')}` }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.done ? '✅' : item.unavailable ? '⚠️' : '○'}</span>
                <span className="text-xs font-medium" style={{ color: item.done ? p.text('#27AE60') : p.text('#2C3E50') }}>{item.label}</span>
                {item.unavailable && <span className="text-xs ml-auto" style={{ color: p.text('#C0392B') }}>Indisponible</span>}
                {!item.done && !item.unavailable && <span className="text-xs ml-auto flex-shrink-0" style={{ color: p.text('#2980B9') }}>→</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {kpis.map(kpi => (
          <Link key={kpi.label} href={kpi.path}
            className={`rounded-md p-4 sm:p-5 transition-all min-w-0${gc}${glass ? ' cg-lift' : ''}`}
            style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}
            onMouseEnter={e => { if (glass) return; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = p.line('#CED4DA'); }}
            onMouseLeave={e => { if (glass) return; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = p.line('#E9ECEF'); }}>
            {glass ? (
              <div className="flex items-center gap-3 sm:gap-4">
                <span aria-hidden="true" className="cg-tile flex items-center justify-center flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12"
                  style={{ backgroundColor: kpi.bg, color: kpi.color, borderRadius: 'var(--cg-radius-lg)', border: '1px solid var(--cg-glass-border)' }}>
                  <KpiIcon name={kpi.icon} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium mb-0.5" style={{ color: p.text('#6C757D') }}>{kpi.label}</p>
                  <p className="text-3xl font-black leading-none" style={{ color: kpi.color }}>
                    {loading ? '…' : coreError ? '—' : kpi.value}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium mb-1" style={{ color: p.text('#6C757D') }}>{kpi.label}</p>
                <p className="text-3xl font-black" style={{ color: kpi.color }}>
                  {loading ? '…' : coreError ? '—' : kpi.value}
                </p>
              </>
            )}
          </Link>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          ZONE 1 — ACTIONS REQUISES MAINTENANT
      ════════════════════════════════════════════════════ */}
      {actionsRequises > 0 && (
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.bg('#C0392B') }} />
              <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: p.text('#2C3E50') }}>
                Actions requises
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: p.bg('#C0392B') }}>
              {actionsRequises}
            </span>
          </div>

          <div className="space-y-3">
            {/* Approbations en attente */}
            {pendingApprovals.length > 0 && (
              <div className={`rounded-md p-4${gc}`}
                style={{ backgroundColor: p.bg('#FDEDEC'), border: `1px solid ${p.line('#F1948A')}` }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: p.text('#C0392B') }}>
                  ✓ {pendingApprovals.length} document{pendingApprovals.length > 1 ? 's' : ''} en attente d'approbation
                </p>
                <div className="space-y-2">
                  {pendingApprovals.map(approval => (
                    <Link key={approval.id} href={`/projects/${approval.id}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded transition-colors"
                      style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#F1948A')}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#FEF9E7')}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = p.bg('#FFFFFF')}>
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white flex-shrink-0"
                          style={{ backgroundColor: p.bg('#C0392B') }}>{approval.documentType}</span>
                        <span className="text-sm font-medium break-words" style={{ color: p.text('#2C3E50') }}>{approval.name}</span>
                        <span className="text-xs break-words" style={{ color: p.text('#6C757D') }}>— {approval.client?.name}</span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: p.text('#C0392B') }}>Réviser →</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Délais de livraison mandats */}
            {mandateDelays.filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level)).length > 0 && (
              <div className={`rounded-md p-4${gc}`}
                style={{
                  backgroundColor: mandateDelays.some(d => ['DEPASSE', 'CRITIQUE'].includes(d.level)) ? p.bg('#FDEDEC') : p.bg('#FEF9E7'),
                  border: `1px solid ${mandateDelays.some(d => ['DEPASSE', 'CRITIQUE'].includes(d.level)) ? p.line('#F1948A') : p.line('#FAD7A0')}`,
                }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2"
                  style={{ color: mandateDelays.some(d => ['DEPASSE', 'CRITIQUE'].includes(d.level)) ? p.text('#C0392B') : p.text('#F39C12') }}>
                  ⚡ {mandateDelays.filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level)).length} délai{mandateDelays.length > 1 ? 's' : ''} de livraison
                </p>
                <div className="space-y-2">
                  {mandateDelays
                    .filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level))
                    .sort((a, b) => a.diffDays - b.diffDays)
                    .map(d => {
                      const isUrgent = ['DEPASSE', 'CRITIQUE'].includes(d.level);
                      return (
                        <Link key={d.mandateId} href={`/projects/${d.projectId}/mandate`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded transition-colors"
                          style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${isUrgent ? p.line('#F1948A') : p.line('#FAD7A0')}` }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = isUrgent ? p.bg('#FDEDEC') : p.bg('#FEF9E7')}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = p.bg('#FFFFFF')}>
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg">
                              {d.level === 'DEPASSE' ? '🔴' : d.level === 'CRITIQUE' ? '🔴' : d.level === 'URGENT' ? '🟠' : '🟡'}
                            </span>
                            <div>
                              <p className="text-sm font-medium" style={{ color: p.text('#2C3E50') }}>{d.projectName}</p>
                              <p className="text-xs" style={{ color: p.text('#6C757D') }}>{d.clientName}</p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right w-full sm:w-auto sm:flex-shrink-0">
                            <p className="text-sm font-bold"
                              style={{ color: isUrgent ? p.text('#C0392B') : p.text('#F39C12') }}>
                              {d.diffDays < 0
                                ? `Dépassé de ${Math.abs(d.diffDays)}j`
                                : d.diffDays === 0 ? "Aujourd'hui !"
                                : `${d.diffDays}j restants`}
                            </p>
                            <p className="text-xs" style={{ color: p.text('#ADB5BD') }}>
                              {new Date(d.dateLimite).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Documents à renouveler URGENT */}
            {updates.filter(u => u.level === 'URGENT').length > 0 && (
              <div className={`rounded-md p-4${gc}`}
                style={{ backgroundColor: p.bg('#FDEDEC'), border: `1px solid ${p.line('#F1948A')}` }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: p.text('#C0392B') }}>
                  🔔 {updates.filter(u => u.level === 'URGENT').length} document{updates.filter(u => u.level === 'URGENT').length > 1 ? 's' : ''} à renouveler de toute urgence
                </p>
                <div className="space-y-2">
                  {updates.filter(u => u.level === 'URGENT').map(u => (
                    <Link key={u.id} href={`/projects/${u.id}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded"
                      style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#F1948A')}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#FEF9E7')}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = p.bg('#FFFFFF')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: p.bg('#C0392B') }}>{u.documentType}</span>
                        <div>
                          <p className="text-sm font-medium break-words" style={{ color: p.text('#2C3E50') }}>{u.name}</p>
                          <p className="text-xs break-words" style={{ color: p.text('#6C757D') }}>{u.clientName} — {u.buildingName}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold w-full sm:w-auto sm:flex-shrink-0 text-left sm:text-right" style={{ color: p.text('#C0392B') }}>
                        {u.monthsAgo} mois ⚠
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Activités récurrentes à renouveler */}
            {recurringToRenew.length > 0 && (
              <div className={`rounded-md p-4${gc}`}
                style={{ backgroundColor: p.bg('#FEF9E7'), border: `1px solid ${p.line('#FAD7A0')}` }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: p.text('#F39C12') }}>
                  🔄 {recurringToRenew.length} activité{recurringToRenew.length > 1 ? 's' : ''} récurrente{recurringToRenew.length > 1 ? 's' : ''} à renouveler
                </p>
                <div className="space-y-2">
                  {recurringToRenew.map(a => (
                    <Link key={a.id} href={`/projects/${a.projectId}/activities`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded transition-colors"
                      style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#FAD7A0')}` }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#FFFBF0')}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = p.bg('#FFFFFF')}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: p.text('#2C3E50') }}>{a.label}</p>
                        <p className="text-xs" style={{ color: p.text('#6C757D') }}>{a.clientName} — {a.buildingName}</p>
                      </div>
                      <p className="text-sm font-bold w-full sm:w-auto sm:flex-shrink-0 text-left sm:text-right" style={{ color: p.text('#F39C12') }}>
                        {a.monthsAgo} mois
                      </p>
                    </Link>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: p.text('#ADB5BD') }}>
                  💡 Allez dans Activités du projet → "Dupliquer pour l'an prochain"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          ZONE 2 — VUE D'ENSEMBLE
      ════════════════════════════════════════════════════ */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.bg('#ADB5BD') }} />
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: p.text('#2C3E50') }}>
            Vue d'ensemble
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {/* Activités à venir */}
        <div className={`xl:col-span-2 rounded-md min-w-0${gc}`}
          style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-4"
            style={{ borderBottom: `1px solid ${p.line('#E9ECEF')}` }}>
            <h3 className="font-semibold text-sm" style={{ color: p.text('#2C3E50') }}>
              📅 Activités des 30 prochains jours
            </h3>
            <button onClick={() => router.push('/activities/portfolio')}
              className={`text-xs px-3 py-1.5 rounded transition-colors${glass ? ' cg-btn' : ''}`}
              style={{ border: `1px solid ${p.line('#DEE2E6')}`, color: p.text('#6C757D') }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#F8F9FA')}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = glass ? '' : 'transparent'}>
              Tout voir →
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-center py-8 animate-pulse" style={{ color: p.text('#ADB5BD') }}>Chargement...</p>
          ) : zoneErrors.upcoming ? (
            <div role="alert" className="text-center py-8 px-4">
              <p className="text-sm font-medium" style={{ color: p.text('#C0392B') }}>Activités indisponibles</p>
              <button type="button" onClick={fetchAll} className="text-xs underline mt-2" style={{ color: p.text('#2980B9') }}>Réessayer</button>
            </div>
          ) : upcomingActivities.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm" style={{ color: p.text('#ADB5BD') }}>Aucune activité prévue dans les 30 prochains jours</p>
            </div>
          ) : (
            <div>
              {upcomingActivities.map((activity, idx) => {
                const status = activityStatusConfig[activity.status] || activityStatusConfig['a_faire'];
                const label = activity.customLabel || activity.label;
                const daysLeft = Math.ceil((new Date(activity.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link key={activity.id} href={`/projects/${activity.projectId}/activities`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 transition-colors"
                    style={{ borderBottom: idx < upcomingActivities.length - 1 ? `1px solid ${p.line('#F8F9FA')}` : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#F8F9FA')}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: p.text('#2C3E50') }}>{label}</p>
                      <p className="text-xs" style={{ color: p.text('#ADB5BD') }}>
                        {activity.clientName} · {activity.projectName}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto sm:flex-shrink-0 sm:ml-4">
                      <span className="text-xs font-bold"
                        style={{ color: daysLeft <= 7 ? p.text('#C0392B') : daysLeft <= 14 ? p.text('#F39C12') : p.text('#27AE60') }}>
                        {daysLeft === 0 ? "Aujourd'hui" : daysLeft === 1 ? 'Demain' : `Dans ${daysLeft}j`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: p.bg(status.bg), color: p.text(status.color) }}>
                        {status.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tâches */}
        <div className={`rounded-md${gc}`}
          style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#E9ECEF')}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${p.line('#E9ECEF')}` }}>
            <h3 className="font-semibold text-sm" style={{ color: p.text('#2C3E50') }}>⚠️ Mes tâches</h3>
          </div>
          {loading ? (
            <p className="text-sm text-center py-8 animate-pulse" style={{ color: p.text('#ADB5BD') }}>Chargement...</p>
          ) : zoneErrors.tasks ? (
            <div role="alert" className="text-center py-8 px-4">
              <p className="text-sm font-medium" style={{ color: p.text('#C0392B') }}>Tâches indisponibles</p>
              <button type="button" onClick={fetchAll} className="text-xs underline mt-2" style={{ color: p.text('#2980B9') }}>Réessayer</button>
            </div>
          ) : lateTasks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm" style={{ color: p.text('#ADB5BD') }}>Aucune tâche en retard</p>
            </div>
          ) : (
            <div>
              {lateTasks.map((task, idx) => (
                <Link key={task.id} href={`/projects/${task.projectId}/mandate`}
                  className="block px-4 sm:px-5 py-3 transition-colors"
                  style={{ borderBottom: idx < lateTasks.length - 1 ? `1px solid ${p.line('#F8F9FA')}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = p.bg('#FEF9E7')}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <p className="text-xs font-medium" style={{ color: p.text('#2C3E50') }}>{task.taskTitle}</p>
                  <p className="text-xs mt-0.5" style={{ color: p.text('#ADB5BD') }}>{task.clientName}</p>
                  <div className="flex gap-2 mt-1">
                    {task.isAssignedToMe && (
                      <span className="text-xs font-medium" style={{ color: p.text('#2980B9') }}>👤 Assigné à moi</span>
                    )}
                    {task.isLate && (
                      <span className="text-xs font-bold" style={{ color: p.text('#C0392B') }}>
                        {Math.ceil((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))}j de retard
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documents à renouveler — AVERTISSEMENT seulement */}
      {updates.filter(u => u.level === 'AVERTISSEMENT').length > 0 && (
        <div className={`rounded-md p-4 sm:p-5 mb-6${gc}`}
          style={{ backgroundColor: p.bg('#FFFFFF'), border: `1px solid ${p.line('#FAD7A0')}` }}>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span style={{ fontSize: '16px' }}>🔔</span>
            <h3 className="font-semibold text-sm" style={{ color: p.text('#2C3E50') }}>Documents bientôt à renouveler</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: p.bg('#FEF9E7'), color: p.text('#F39C12') }}>
              {updates.filter(u => u.level === 'AVERTISSEMENT').length} document{updates.filter(u => u.level === 'AVERTISSEMENT').length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {updates.filter(u => u.level === 'AVERTISSEMENT').map(u => (
              <Link key={u.id} href={`/projects/${u.id}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded transition-colors"
                style={{ backgroundColor: p.bg('#FEF9E7'), border: `1px solid ${p.line('#FAD7A0')}` }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: p.bg('#F39C12') }}>{u.documentType}</span>
                  <div>
                    <p className="text-sm font-medium break-words" style={{ color: p.text('#2C3E50') }}>{u.name}</p>
                    <p className="text-xs break-words" style={{ color: p.text('#6C757D') }}>{u.clientName} — {u.buildingName}</p>
                  </div>
                </div>
                <p className="text-sm font-bold w-full sm:w-auto sm:flex-shrink-0 text-left sm:text-right" style={{ color: p.text('#F39C12') }}>
                  {u.monthsAgo} mois ○
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Projets récents */}
<div
  className={`rounded-md${gc}`}
  style={{
    backgroundColor: p.bg('#FFFFFF'),
    border: `1px solid ${p.line('#E9ECEF')}`,
  }}
>
  <div
    className="flex items-center justify-between px-4 sm:px-5 py-4"
    style={{ borderBottom: `1px solid ${p.line('#E9ECEF')}` }}
  >
    <h3
      className="font-semibold text-sm"
      style={{ color: p.text('#2C3E50') }}
    >
      Projets récents
    </h3>

    <button
      onClick={() => router.push('/projects')}
      className={`text-xs px-3 py-1.5 rounded transition-colors${glass ? ' cg-btn' : ''}`}
      style={{
        border: `1px solid ${p.line('#DEE2E6')}`,
        color: p.text('#6C757D'),
      }}
      onMouseEnter={e =>
        (e.currentTarget.style.backgroundColor = p.bg('#F8F9FA'))
      }
      onMouseLeave={e =>
        (e.currentTarget.style.backgroundColor = glass ? '' : 'transparent')
      }
    >
      Voir tous →
    </button>
  </div>

  {loading ? (
    <p
      className="text-sm text-center py-8 animate-pulse"
      style={{ color: p.text('#ADB5BD') }}
    >
      Chargement...
    </p>
  ) : coreError ? (
    <div role="alert" className="text-center py-10 px-4">
      <p className="text-sm font-medium" style={{ color: p.text('#C0392B') }}>Projets indisponibles</p>
      <button type="button" onClick={fetchAll} className="text-xs underline mt-2" style={{ color: p.text('#2980B9') }}>Réessayer</button>
    </div>
  ) : projetsRecents.length === 0 ? (
    <div className="text-center py-12">
      <p
        className="text-sm"
        style={{ color: p.text('#ADB5BD') }}
      >
        Aucun projet pour l'instant
      </p>
    </div>
  ) : (
    <>
      {/* MOBILE */}
      <div className="md:hidden">
        {projetsRecents.map((projet, idx) => {
          const s =
            statusConfig[projet.status] ||
            statusConfig['DRAFT'];

          return (
            <Link
              key={projet.id}
              href={`/projects/${projet.id}`}
              className="block p-4 transition-colors"
              style={{
                borderBottom:
                  idx < projetsRecents.length - 1
                    ? `1px solid ${p.line('#F8F9FA')}`
                    : 'none',
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor =
                  p.bg('#F8F9FA'))
              }
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor =
                  'transparent')
              }
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold break-words"
                    style={{ color: p.text('#2C3E50') }}
                  >
                    {projet.name}
                  </p>

                  <p
                    className="text-xs mt-1 break-words"
                    style={{ color: p.text('#6C757D') }}
                  >
                    {projet.client?.name || '—'}
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold text-white flex-shrink-0${glass ? ' cg-pill-solid' : ''}`}
                  style={{ backgroundColor: p.bg('#C0392B') }}
                >
                  {projet.documentType}
                </span>
              </div>

              <p
                className="text-xs mb-3 break-words"
                style={{ color: p.text('#6C757D') }}
              >
                🏢 {projet.building?.name || '—'}
              </p>

              <div className="flex items-center justify-between gap-3 mb-3">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: p.bg(s.bg),
                    color: p.text(s.color),
                    border: `1px solid ${s.border}`,
                  }}
                >
                  {s.label}
                </span>

                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: p.text('#ADB5BD') }}
                >
                  {new Date(
                    projet.updatedAt
                  ).toLocaleDateString('fr-CA')}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-xs"
                    style={{ color: p.text('#ADB5BD') }}
                  >
                    Progression
                  </span>

                  <span
                    className="text-xs font-medium"
                    style={{ color: p.text('#6C757D') }}
                  >
                    {projet.progress || 0}%
                  </span>
                </div>

                <div
                  className="w-full h-1.5 rounded-full"
                  style={{ backgroundColor: p.bg('#E9ECEF') }}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${projet.progress || 0}%`,
                      backgroundColor:
                        projet.progress === 100
                          ? p.bg('#27AE60')
                          : p.bg('#C0392B'),
                    }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* TABLETTE + DESKTOP */}
      <div className="hidden md:block">
        <table
          className="w-full text-sm"
          style={{ borderCollapse: 'collapse' }}
        >
          <thead>
            <tr style={{ backgroundColor: p.bg('#F8F9FA') }}>
              {[
                'Projet',
                'Client',
                'Bâtiment',
                'Type',
                'Statut',
                'Progression',
                'Modifié',
              ].map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{
                    color: p.text('#ADB5BD'),
                    borderBottom: `1px solid ${p.line('#E9ECEF')}`,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {projetsRecents.map((projet, idx) => {
              const s =
                statusConfig[projet.status] ||
                statusConfig['DRAFT'];

              return (
                <tr
                  key={projet.id}
                  className="transition-colors"
                  style={{
                    borderBottom:
                      idx < projetsRecents.length - 1
                        ? `1px solid ${p.line('#F8F9FA')}`
                        : 'none',
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.backgroundColor =
                      p.bg('#F8F9FA'))
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.backgroundColor =
                      'transparent')
                  }
                >
                  <td
                    className="px-4 py-3 font-medium"
                    style={{ color: p.text('#2C3E50') }}
                  >
                    <Link href={`/projects/${projet.id}`} className="underline-offset-2 hover:underline focus:underline">
                      {projet.name}
                    </Link>
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: p.text('#495057') }}
                  >
                    {projet.client?.name || '—'}
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: p.text('#495057') }}
                  >
                    {projet.building?.name || '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold text-white${glass ? ' cg-pill-solid' : ''}`}
                      style={{ backgroundColor: p.bg('#C0392B') }}
                    >
                      {projet.documentType}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: p.bg(s.bg),
                        color: p.text(s.color),
                        border: `1px solid ${s.border}`,
                      }}
                    >
                      {s.label}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-16 h-1.5 rounded-full"
                        style={{
                          backgroundColor: p.bg('#E9ECEF'),
                        }}
                      >
                        <div
                          className="h-1.5 rounded-full"
                          style={{
                            width: `${projet.progress || 0}%`,
                            backgroundColor:
                              projet.progress === 100
                                ? p.bg('#27AE60')
                                : p.bg('#C0392B'),
                          }}
                        />
                      </div>

                      <span
                        className="text-xs"
                        style={{ color: p.text('#ADB5BD') }}
                      >
                        {projet.progress || 0}%
                      </span>
                    </div>
                  </td>

                  <td
                    className="px-4 py-3 text-xs"
                    style={{ color: p.text('#ADB5BD') }}
                  >
                    {new Date(
                      projet.updatedAt
                    ).toLocaleDateString('fr-CA')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  )}
</div>
    </AppLayout>
  );
}
