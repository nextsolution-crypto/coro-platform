'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '../store/auth';
import PortalLayout from '../components/PortalLayout';
import { Shield, AlertTriangle, CheckCircle, Zap, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const clientFetch = async (path: string) => {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
  });
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
};

const STATUS_CONFIG = {
  READY:    { label: 'Opérationnel',     color: '#27AE60', bg: '#EAFAF1', icon: '🟢' },
  REDUCED:  { label: 'Capacité réduite', color: '#E67E22', bg: '#FEF9E7', icon: '🟠' },
  CRITICAL: { label: 'Critique',         color: '#C0392B', bg: '#FDEDEC', icon: '🔴' },
};

const REC_CONFIG = {
  CRITICAL: { color: '#C0392B', bg: '#FDEDEC', icon: '🔴', label: 'CRITIQUE' },
  WARNING:  { color: '#E67E22', bg: '#FEF9E7', icon: '🟠', label: 'ATTENTION' },
  INFO:     { color: '#2980B9', bg: '#EBF5FB', icon: '🔵', label: 'INFO' },
};

const CAT_ICONS: Record<string, string> = {
  ROLES: '🛡️', QUALIFICATIONS: '🎓', PLANS: '📄', EXERCISES: '🔔', INCIDENTS: '📋',
};

export default function IntelligencePage() {
  const router = useRouter();

  const clientFetch = async (path: string, method = 'GET', body?: any) => {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error('Erreur réseau');
    return res.json();
  };

  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<'all' | 'CRITICAL' | 'WARNING' | 'INFO'>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [lastUpdate, setLastUpdate]   = useState<Date | null>(null);
  const [activeTab, setActiveTab]     = useState<'recommendations' | 'actions'>('recommendations');
  const [actions, setActions]         = useState<any[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [showAddAction, setShowAddAction]   = useState(false);
  const [newAction, setNewAction]     = useState({ title: '', description: '', category: 'GENERAL', priority: 'WARNING', assignedTo: '', dueDate: '', buildingId: '' });
  const [savingAction, setSavingAction]     = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace('/login'); return; }
    fetchData();
    fetchActions();
  }, []);

  const fetchActions = async () => {
    setLoadingActions(true);
    try {
      const res = await clientFetch('/client-portal/corrective-actions');
      setActions(res || []);
    } catch (e) { console.error(e); }
    finally { setLoadingActions(false); }
  };

  const handleCreateAction = async () => {
    if (!newAction.title.trim()) return;
    setSavingAction(true);
    try {
      await clientFetch('/client-portal/corrective-actions', 'POST', newAction);
      setShowAddAction(false);
      setNewAction({ title: '', description: '', category: 'GENERAL', priority: 'WARNING', assignedTo: '', dueDate: '', buildingId: '' });
      await fetchActions();
    } catch (e) { console.error(e); }
    finally { setSavingAction(false); }
  };

  const handleUpdateActionStatus = async (id: string, status: string) => {
    try {
      await clientFetch(`/client-portal/corrective-actions/${id}`, 'PUT', { status });
      await fetchActions();
    } catch (e) { console.error(e); }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await clientFetch('/client-portal/intelligence/overview');
      setData(res);
      setLastUpdate(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Analyse en cours...</p>
      </div>
    </PortalLayout>
  );

  if (!data) return null;

  const globalScfg = STATUS_CONFIG[data.globalStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CRITICAL;

  const filteredRecs = (data.recommendations || []).filter((r: any) => {
    const typeOk     = filter === 'all' || r.type === filter;
    const buildingOk = buildingFilter === 'all' || r.buildingId === buildingFilter;
    return typeOk && buildingOk;
  });

  return (
    <PortalLayout>
      <header style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 900, color: '#2C3E50', display: 'flex', alignItems: 'center', gap: 8 }}>
              💡 Intelligence organisationnelle
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdate && <span style={{ fontSize: 11, color: '#ADB5BD' }}>Analysé à {lastUpdate.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button type="button" onClick={fetchData}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
              <RefreshCw size={13} /> Actualiser
            </button>
          </div>
        </div>
      </header>

      {/* Score global */}
      <div style={{ marginBottom: 16, padding: '20px 24px', borderRadius: 12, border: `2px solid ${globalScfg.color}`, backgroundColor: globalScfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>{globalScfg.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: globalScfg.color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Indice CORO — Organisation</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: globalScfg.color }}>{globalScfg.label}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: globalScfg.color, lineHeight: 1 }}>{data.avgScore}%</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Score moyen</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>{data.totalBuildings}</p>
            <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Bâtiment{data.totalBuildings > 1 ? 's' : ''}</p>
          </div>
          {data.summary.criticalCount > 0 && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 38, fontWeight: 900, color: '#C0392B', lineHeight: 1 }}>{data.summary.criticalCount}</p>
              <p style={{ margin: 0, fontSize: 11, color: '#6C757D' }}>Critique{data.summary.criticalCount > 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>

      {/* Résumé par bâtiment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 24 }}>
        {(data.buildings || []).map((b: any) => {
          const scfg = STATUS_CONFIG[b.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.CRITICAL;
          const critCount = (b.recommendations || []).filter((r: any) => r.type === 'CRITICAL').length;
          return (
            <div key={b.buildingId} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, border: `1px solid ${scfg.color}40`, padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => router.push(`/sentinelle/${b.buildingId}/resilience`)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50', lineHeight: 1.3, flex: 1 }}>{b.buildingName}</p>
                <span style={{ fontSize: 16, flexShrink: 0, marginLeft: 6 }}>{scfg.icon}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: scfg.color }}>{b.score}%</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 11, color: '#ADB5BD' }}>{b.presentMembers}/{b.totalMembers} membres</span>
                </div>
              </div>
              <div style={{ height: 4, backgroundColor: '#F1F3F5', borderRadius: 2, marginTop: 8 }}>
                <div style={{ height: '100%', width: `${b.score}%`, backgroundColor: scfg.color, borderRadius: 2 }} />
              </div>
              {critCount > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#C0392B', fontWeight: 600 }}>
                  {critCount} alerte{critCount > 1 ? 's' : ''} critique{critCount > 1 ? 's' : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid #E9ECEF', paddingBottom: 1 }}>
        {([
          { key: 'recommendations', label: `📋 Recommandations (${data?.summary?.total || 0})` },
          { key: 'actions',         label: `✅ Actions correctives (${actions.filter(a => a.status !== 'CANCELLED').length})` },
        ] as const).map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            style={{ padding: '8px 16px', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent',
              backgroundColor: 'transparent', cursor: 'pointer', fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#C0392B' : '#6C757D', marginBottom: -1 }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Onglet Recommandations ── */}
      {activeTab === 'recommendations' && <>
      {/* Filtres recommandations */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
          Recommandations prioritaires — {filteredRecs.length} résultat{filteredRecs.length > 1 ? 's' : ''}
        </h2>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Filtre type */}
          {(['all', 'CRITICAL', 'WARNING', 'INFO'] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                borderColor: filter === f ? '#2C3E50' : '#E9ECEF',
                backgroundColor: filter === f ? '#2C3E50' : '#FFFFFF',
                color: filter === f ? '#FFFFFF' : '#6C757D' }}>
              {f === 'all' ? `Tous (${data.summary.total})` : f === 'CRITICAL' ? `🔴 ${data.summary.criticalCount}` : f === 'WARNING' ? `🟠 ${data.summary.warningCount}` : `🔵 ${data.summary.infoCount}`}
            </button>
          ))}
          {/* Filtre bâtiment */}
          {data.totalBuildings > 1 && (
            <select value={buildingFilter} onChange={e => setBuildingFilter(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', fontSize: 11, color: '#6C757D', backgroundColor: '#FFFFFF', cursor: 'pointer' }}>
              <option value="all">Tous les bâtiments</option>
              {(data.buildings || []).map((b: any) => (
                <option key={b.buildingId} value={b.buildingId}>{b.buildingName}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Liste recommandations */}
      {filteredRecs.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <CheckCircle size={36} color="#27AE60" style={{ margin: '0 auto 16px' }} />
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune recommandation</p>
          <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Tous vos bâtiments sont pleinement opérationnels.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredRecs.map((rec: any, i: number) => {
            const rcfg = REC_CONFIG[rec.type as keyof typeof REC_CONFIG] || REC_CONFIG.INFO;
            return (
              <div key={i} style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: rcfg.bg, border: `1px solid ${rcfg.color}30`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{rcfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: rcfg.color, backgroundColor: '#FFFFFF', padding: '2px 7px', borderRadius: 4, border: `1px solid ${rcfg.color}40` }}>
                      {rcfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#6C757D' }}>{CAT_ICONS[rec.category] || '•'} {rec.category}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#2C3E50', backgroundColor: '#F8F9FA', padding: '2px 7px', borderRadius: 4 }}>
                      🏢 {rec.buildingName}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>{rec.message}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Zap size={11} color={rcfg.color} />
                    <p style={{ margin: 0, fontSize: 12, color: '#6C757D' }}>{rec.action}</p>
                  </div>
                </div>
                <button type="button" onClick={() => router.push(`/sentinelle/${rec.buildingId}/resilience`)}
                  style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#2C3E50', whiteSpace: 'nowrap' as const }}>
                  Voir →
                </button>
              </div>
            );
          })}
        </div>
      )}

      </>}

      {/* ── Onglet Actions correctives ── */}
      {activeTab === 'actions' && (
        <div>
          {/* Bouton ajouter */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" onClick={() => setShowAddAction(!showAddAction)}
              style={{ padding: '9px 18px', borderRadius: 8, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              + Nouvelle action
            </button>
          </div>

          {/* Formulaire ajout */}
          {showAddAction && (
            <div style={{ marginBottom: 20, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>Nouvelle action corrective</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Titre *</label>
                  <input type="text" value={newAction.title} placeholder="Ex: Organiser un exercice d'évacuation"
                    onChange={e => setNewAction(prev => ({ ...prev, title: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Priorité</label>
                  <select value={newAction.priority} onChange={e => setNewAction(prev => ({ ...prev, priority: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, backgroundColor: '#FFFFFF', boxSizing: 'border-box' as const }}>
                    <option value="CRITICAL">🔴 Critique</option>
                    <option value="WARNING">🟠 Attention</option>
                    <option value="INFO">🔵 Info</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Catégorie</label>
                  <select value={newAction.category} onChange={e => setNewAction(prev => ({ ...prev, category: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, backgroundColor: '#FFFFFF', boxSizing: 'border-box' as const }}>
                    <option value="ROLES">🛡️ Rôles</option>
                    <option value="QUALIFICATIONS">🎓 Qualifications</option>
                    <option value="PLANS">📄 Plans</option>
                    <option value="EXERCISES">🔔 Exercices</option>
                    <option value="INCIDENTS">📋 Incidents</option>
                    <option value="GENERAL">⚙️ Général</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Bâtiment</label>
                  <select value={newAction.buildingId} onChange={e => setNewAction(prev => ({ ...prev, buildingId: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, backgroundColor: '#FFFFFF', boxSizing: 'border-box' as const }}>
                    <option value="">Tous</option>
                    {(data?.buildings || []).map((b: any) => <option key={b.buildingId} value={b.buildingId}>{b.buildingName}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Responsable</label>
                  <input type="text" value={newAction.assignedTo} placeholder="Nom du responsable"
                    onChange={e => setNewAction(prev => ({ ...prev, assignedTo: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Échéance</label>
                  <input type="date" value={newAction.dueDate}
                    onChange={e => setNewAction(prev => ({ ...prev, dueDate: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' as const }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Description</label>
                  <textarea value={newAction.description} rows={2} placeholder="Détails de l'action à prendre..."
                    onChange={e => setNewAction(prev => ({ ...prev, description: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, resize: 'none', boxSizing: 'border-box' as const }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={handleCreateAction} disabled={savingAction || !newAction.title.trim()}
                  style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#27AE60', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: savingAction || !newAction.title.trim() ? 0.6 : 1 }}>
                  {savingAction ? 'Enregistrement...' : '✅ Créer l\'action'}
                </button>
                <button type="button" onClick={() => setShowAddAction(false)}
                  style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, cursor: 'pointer' }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Liste actions */}
          {loadingActions ? (
            <p style={{ color: '#ADB5BD', fontSize: 13, textAlign: 'center', padding: 32 }}>Chargement...</p>
          ) : actions.filter(a => a.status !== 'CANCELLED').length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
              <CheckCircle size={36} color="#27AE60" style={{ margin: '0 auto 16px' }} />
              <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>Aucune action corrective</p>
              <p style={{ margin: 0, fontSize: 14, color: '#ADB5BD' }}>Créez des actions depuis les recommandations ou manuellement.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actions.filter(a => a.status !== 'CANCELLED').map((action: any) => {
                const priorityCfg = REC_CONFIG[action.priority as keyof typeof REC_CONFIG] || REC_CONFIG.INFO;
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  PLANNED:     { label: 'Planifiée',   color: '#6C757D', bg: '#F8F9FA' },
                  IN_PROGRESS: { label: 'En cours',    color: '#2980B9', bg: '#EBF5FB' },
                  COMPLETED:   { label: 'Complétée',   color: '#27AE60', bg: '#EAFAF1' },
                  VERIFIED:    { label: 'Vérifiée',    color: '#117864', bg: '#E8F8F5' },
                  CLOSED:      { label: 'Fermée',      color: '#566573', bg: '#F2F4F4' },
                };
                const scfg = statusConfig[action.status] || statusConfig.PLANNED;
                const terminalStatuses = ['COMPLETED', 'VERIFIED', 'CLOSED', 'CANCELLED'];
                const isOverdue = action.dueDate && new Date(action.dueDate) < new Date() && !terminalStatuses.includes(action.status);

                return (
                  <div key={action.id} style={{ padding: '14px 18px', borderRadius: 10, backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{priorityCfg.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{action.title}</span>
                        <span style={{ fontSize: 10, color: '#ADB5BD' }}>{action.reference || 'Action historique'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: scfg.color, backgroundColor: scfg.bg, padding: '2px 7px', borderRadius: 4 }}>{scfg.label}</span>
                        {isOverdue && <span style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', backgroundColor: '#FDEDEC', padding: '2px 7px', borderRadius: 4 }}>⚠️ En retard</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {action.assignedTo && <span style={{ fontSize: 12, color: '#6C757D' }}>👤 {action.assignedTo}</span>}
                        {action.dueDate && <span style={{ fontSize: 12, color: isOverdue ? '#C0392B' : '#6C757D' }}>📅 {new Date(action.dueDate).toLocaleDateString('fr-CA')}</span>}
                        <span style={{ fontSize: 12, color: '#ADB5BD' }}>{CAT_ICONS[action.category] || '•'} {action.category}</span>
                      </div>
                      {action.description && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#ADB5BD' }}>{action.description}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      {action.buildingId && <button type="button" onClick={() => router.push(`/sentinelle/${action.buildingId}/corrective-actions/${action.id}`)}
                        style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #CED4DA', backgroundColor: '#FFFFFF', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                        Consulter
                      </button>}
                      {action.status === 'PLANNED' && (
                        <button type="button" onClick={() => handleUpdateActionStatus(action.id, 'IN_PROGRESS')}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #AED6F1', backgroundColor: '#EBF5FB', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#2980B9' }}>
                          Démarrer
                        </button>
                      )}
                      {action.status === 'IN_PROGRESS' && (
                        <button type="button" onClick={() => handleUpdateActionStatus(action.id, 'COMPLETED')}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #A9DFBF', backgroundColor: '#EAFAF1', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#27AE60' }}>
                          ✓ Compléter
                        </button>
                      )}
                      {!terminalStatuses.includes(action.status) && (
                        <button type="button" onClick={() => handleUpdateActionStatus(action.id, 'CANCELLED')}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 11, color: '#ADB5BD' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Note conformité */}
      <p style={{ textAlign: 'center', fontSize: 11, color: '#ADB5BD', marginTop: 24 }}>
        Analyse basée sur les 4 composantes CORO · Conforme ISO 22301 · CNPI 2020 · CNESST
      </p>
    </PortalLayout>
  );
}
