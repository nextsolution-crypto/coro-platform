'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';

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

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [projets, setProjets] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [lateTasks, setLateTasks] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [recurringToRenew, setRecurringToRenew] = useState<any[]>([]);
  const [mandateDelays, setMandateDelays] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchAll();
  }, [isAuthenticated]);

  const fetchAll = async () => {
    try {
      const [projetsRes, updatesRes, approvalsRes, recurringRes, upcomingRes, delaysRes] = await Promise.all([
        api.get('/projects?limit=200'),
        api.get('/projects/upcoming-updates').catch(() => ({ data: [] })),
        api.get('/projects/pending-approval').catch(() => ({ data: [] })),
        api.get('/activities/recurring-to-renew').catch(() => ({ data: [] })),
        api.get('/activities/upcoming').catch(() => ({ data: [] })),
        api.get('/notifications/mandate-delays').catch(() => ({ data: [] })),
      ]);

      const allProjets = projetsRes.data?.projects || projetsRes.data || [];
      setProjets(allProjets);
      setUpdates(updatesRes.data || []);
      setPendingApprovals(approvalsRes.data || []);
      setRecurringToRenew(recurringRes.data || []);
      setMandateDelays(delaysRes.data || []);

      const upcomingFromApi = (upcomingRes.data || []).map((a: any) => ({
        ...a,
        projectName: a.project?.name || '—',
        clientName: a.project?.client?.name || '—',
        projectId: a.projectId,
      }));
      setUpcomingActivities(upcomingFromApi.slice(0, 10));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
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

  const kpis = [
    { label: 'Projets actifs',    value: projetsActifs, color: '#C0392B', bg: '#FDEDEC', path: '/projects' },
    { label: 'En révision',       value: enRevision,    color: '#F39C12', bg: '#FEF9E7', path: '/projects' },
    { label: 'Validés',           value: valides,       color: '#27AE60', bg: '#EAFAF1', path: '/projects' },
    { label: 'Mises à jour dues', value: updates.filter(u => u.level === 'URGENT').length, color: '#8E44AD', bg: '#F4ECF7', path: '/buildings/compliance' },
  ];

  return (
    <AppLayout>
      {/* ── En-tête ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            {today}
          </p>
          <h2 className="text-2xl font-black" style={{ color: '#2C3E50' }}>
            Bonjour, {user.firstName} 👋
          </h2>
          <p className="mt-1 text-sm" style={{ color: '#6C757D' }}>
            {upcomingActivities.length > 0
              ? `${upcomingActivities.length} activité${upcomingActivities.length > 1 ? 's' : ''} prévue${upcomingActivities.length > 1 ? 's' : ''} dans les 30 prochains jours`
              : 'Aucune activité prévue dans les 30 prochains jours'}
          </p>
        </div>
        <button onClick={() => router.push('/projects')}
          className="text-white text-sm font-medium px-4 py-2.5 rounded flex items-center gap-2"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          + Nouveau projet
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map(kpi => (
          <div key={kpi.label}
            onClick={() => router.push(kpi.path)}
            className="rounded-md p-5 cursor-pointer transition-all"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#CED4DA'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#E9ECEF'; }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>{kpi.label}</p>
            <p className="text-3xl font-black" style={{ color: kpi.color }}>
              {loading ? '…' : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════
          ZONE 1 — ACTIONS REQUISES MAINTENANT
      ════════════════════════════════════════════════════ */}
      {actionsRequises > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C0392B' }} />
              <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: '#2C3E50' }}>
                Actions requises
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#C0392B' }}>
              {actionsRequises}
            </span>
          </div>

          <div className="space-y-3">
            {/* Approbations en attente */}
            {pendingApprovals.length > 0 && (
              <div className="rounded-md p-4"
                style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#C0392B' }}>
                  ✓ {pendingApprovals.length} document{pendingApprovals.length > 1 ? 's' : ''} en attente d'approbation
                </p>
                <div className="space-y-2">
                  {pendingApprovals.map(p => (
                    <div key={p.id}
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex items-center justify-between p-3 rounded cursor-pointer transition-colors"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #F1948A' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF9E7'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: '#C0392B' }}>{p.documentType}</span>
                        <span className="text-sm font-medium" style={{ color: '#2C3E50' }}>{p.name}</span>
                        <span className="text-xs" style={{ color: '#6C757D' }}>— {p.client?.name}</span>
                      </div>
                      <span className="text-xs font-medium" style={{ color: '#C0392B' }}>Réviser →</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Délais de livraison mandats */}
            {mandateDelays.filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level)).length > 0 && (
              <div className="rounded-md p-4"
                style={{
                  backgroundColor: mandateDelays.some(d => ['DEPASSE', 'CRITIQUE'].includes(d.level)) ? '#FDEDEC' : '#FEF9E7',
                  border: `1px solid ${mandateDelays.some(d => ['DEPASSE', 'CRITIQUE'].includes(d.level)) ? '#F1948A' : '#FAD7A0'}`,
                }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2"
                  style={{ color: mandateDelays.some(d => ['DEPASSE', 'CRITIQUE'].includes(d.level)) ? '#C0392B' : '#F39C12' }}>
                  ⚡ {mandateDelays.filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level)).length} délai{mandateDelays.length > 1 ? 's' : ''} de livraison
                </p>
                <div className="space-y-2">
                  {mandateDelays
                    .filter(d => ['DEPASSE', 'CRITIQUE', 'URGENT', 'ATTENTION'].includes(d.level))
                    .sort((a, b) => a.diffDays - b.diffDays)
                    .map(d => {
                      const isUrgent = ['DEPASSE', 'CRITIQUE'].includes(d.level);
                      return (
                        <div key={d.mandateId}
                          onClick={() => router.push(`/projects/${d.projectId}/mandate`)}
                          className="flex items-center justify-between p-3 rounded cursor-pointer transition-colors"
                          style={{ backgroundColor: '#FFFFFF', border: `1px solid ${isUrgent ? '#F1948A' : '#FAD7A0'}` }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = isUrgent ? '#FDEDEC' : '#FEF9E7'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {d.level === 'DEPASSE' ? '🔴' : d.level === 'CRITIQUE' ? '🔴' : d.level === 'URGENT' ? '🟠' : '🟡'}
                            </span>
                            <div>
                              <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{d.projectName}</p>
                              <p className="text-xs" style={{ color: '#6C757D' }}>{d.clientName}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold"
                              style={{ color: isUrgent ? '#C0392B' : '#F39C12' }}>
                              {d.diffDays < 0
                                ? `Dépassé de ${Math.abs(d.diffDays)}j`
                                : d.diffDays === 0 ? "Aujourd'hui !"
                                : `${d.diffDays}j restants`}
                            </p>
                            <p className="text-xs" style={{ color: '#ADB5BD' }}>
                              {new Date(d.dateLimite).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Documents à renouveler URGENT */}
            {updates.filter(u => u.level === 'URGENT').length > 0 && (
              <div className="rounded-md p-4"
                style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A' }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#C0392B' }}>
                  🔔 {updates.filter(u => u.level === 'URGENT').length} document{updates.filter(u => u.level === 'URGENT').length > 1 ? 's' : ''} à renouveler de toute urgence
                </p>
                <div className="space-y-2">
                  {updates.filter(u => u.level === 'URGENT').map(u => (
                    <div key={u.id}
                      onClick={() => router.push(`/projects/${u.id}`)}
                      className="flex items-center justify-between p-3 rounded cursor-pointer"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #F1948A' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF9E7'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                          style={{ backgroundColor: '#C0392B' }}>{u.documentType}</span>
                        <div>
                          <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{u.name}</p>
                          <p className="text-xs" style={{ color: '#6C757D' }}>{u.clientName} — {u.buildingName}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold flex-shrink-0" style={{ color: '#C0392B' }}>
                        {u.monthsAgo} mois ⚠
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activités récurrentes à renouveler */}
            {recurringToRenew.length > 0 && (
              <div className="rounded-md p-4"
                style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
                <p className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: '#F39C12' }}>
                  🔄 {recurringToRenew.length} activité{recurringToRenew.length > 1 ? 's' : ''} récurrente{recurringToRenew.length > 1 ? 's' : ''} à renouveler
                </p>
                <div className="space-y-2">
                  {recurringToRenew.map(a => (
                    <div key={a.id}
                      onClick={() => router.push(`/projects/${a.projectId}/activities`)}
                      className="flex items-center justify-between p-3 rounded cursor-pointer transition-colors"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid #FAD7A0' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FFFBF0'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{a.label}</p>
                        <p className="text-xs" style={{ color: '#6C757D' }}>{a.clientName} — {a.buildingName}</p>
                      </div>
                      <p className="text-sm font-bold flex-shrink-0" style={{ color: '#F39C12' }}>
                        {a.monthsAgo} mois
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-3" style={{ color: '#ADB5BD' }}>
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
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ADB5BD' }} />
          <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: '#2C3E50' }}>
            Vue d'ensemble
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Activités à venir */}
        <div className="col-span-2 rounded-md"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>
              📅 Activités des 30 prochains jours
            </h3>
            <button onClick={() => router.push('/activities/portfolio')}
              className="text-xs px-3 py-1.5 rounded transition-colors"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Tout voir →
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-center py-8 animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
          ) : upcomingActivities.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune activité prévue dans les 30 prochains jours</p>
            </div>
          ) : (
            <div>
              {upcomingActivities.map((activity, idx) => {
                const status = activityStatusConfig[activity.status] || activityStatusConfig['a_faire'];
                const label = activity.customLabel || activity.label;
                const daysLeft = Math.ceil((new Date(activity.scheduledDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={activity.id}
                    onClick={() => router.push(`/projects/${activity.projectId}/activities`)}
                    className="flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
                    style={{ borderBottom: idx < upcomingActivities.length - 1 ? '1px solid #F8F9FA' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#2C3E50' }}>{label}</p>
                      <p className="text-xs" style={{ color: '#ADB5BD' }}>
                        {activity.clientName} · {activity.projectName}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs font-bold"
                        style={{ color: daysLeft <= 7 ? '#C0392B' : daysLeft <= 14 ? '#F39C12' : '#27AE60' }}>
                        {daysLeft === 0 ? "Aujourd'hui" : daysLeft === 1 ? 'Demain' : `Dans ${daysLeft}j`}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tâches */}
        <div className="rounded-md"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>⚠️ Mes tâches</h3>
          </div>
          {loading ? (
            <p className="text-sm text-center py-8 animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
          ) : lateTasks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune tâche en retard</p>
            </div>
          ) : (
            <div>
              {lateTasks.map((task, idx) => (
                <div key={task.id}
                  onClick={() => router.push(`/projects/${task.projectId}/mandate`)}
                  className="px-5 py-3 cursor-pointer transition-colors"
                  style={{ borderBottom: idx < lateTasks.length - 1 ? '1px solid #F8F9FA' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF9E7'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <p className="text-xs font-medium" style={{ color: '#2C3E50' }}>{task.taskTitle}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>{task.clientName}</p>
                  <div className="flex gap-2 mt-1">
                    {task.isAssignedToMe && (
                      <span className="text-xs font-medium" style={{ color: '#2980B9' }}>👤 Assigné à moi</span>
                    )}
                    {task.isLate && (
                      <span className="text-xs font-bold" style={{ color: '#C0392B' }}>
                        {Math.ceil((new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24))}j de retard
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Documents à renouveler — AVERTISSEMENT seulement */}
      {updates.filter(u => u.level === 'AVERTISSEMENT').length > 0 && (
        <div className="rounded-md p-5 mb-6"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid #FAD7A0' }}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: '16px' }}>🔔</span>
            <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Documents bientôt à renouveler</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: '#FEF9E7', color: '#F39C12' }}>
              {updates.filter(u => u.level === 'AVERTISSEMENT').length} document{updates.filter(u => u.level === 'AVERTISSEMENT').length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {updates.filter(u => u.level === 'AVERTISSEMENT').map(u => (
              <div key={u.id}
                onClick={() => router.push(`/projects/${u.id}`)}
                className="flex items-center justify-between p-3 rounded cursor-pointer transition-colors"
                style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded text-white"
                    style={{ backgroundColor: '#F39C12' }}>{u.documentType}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{u.name}</p>
                    <p className="text-xs" style={{ color: '#6C757D' }}>{u.clientName} — {u.buildingName}</p>
                  </div>
                </div>
                <p className="text-sm font-bold flex-shrink-0" style={{ color: '#F39C12' }}>
                  {u.monthsAgo} mois ○
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projets récents */}
      <div className="rounded-md"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #E9ECEF' }}>
          <h3 className="font-semibold text-sm" style={{ color: '#2C3E50' }}>Projets récents</h3>
          <button onClick={() => router.push('/projects')}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            Voir tous →
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-center py-8 animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        ) : projetsRecents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun projet pour l'instant</p>
          </div>
        ) : (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA' }}>
                {['Projet', 'Client', 'Bâtiment', 'Type', 'Statut', 'Progression', 'Modifié'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: '#ADB5BD', borderBottom: '1px solid #E9ECEF' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projetsRecents.map((projet, idx) => {
                const s = statusConfig[projet.status] || statusConfig['DRAFT'];
                return (
                  <tr key={projet.id}
                    onClick={() => router.push(`/projects/${projet.id}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: idx < projetsRecents.length - 1 ? '1px solid #F8F9FA' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#2C3E50' }}>{projet.name}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#495057' }}>{projet.client?.name || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#495057' }}>{projet.building?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold text-white"
                        style={{ backgroundColor: '#C0392B' }}>
                        {projet.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full" style={{ backgroundColor: '#E9ECEF' }}>
                          <div className="h-1.5 rounded-full"
                            style={{ width: `${projet.progress || 0}%`, backgroundColor: projet.progress === 100 ? '#27AE60' : '#C0392B' }} />
                        </div>
                        <span className="text-xs" style={{ color: '#ADB5BD' }}>{projet.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: '#ADB5BD' }}>
                      {new Date(projet.updatedAt).toLocaleDateString('fr-CA')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppLayout>
  );
}