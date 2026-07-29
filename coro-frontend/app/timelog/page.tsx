'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

type ViewMode = 'week' | 'month' | 'year' | 'custom';

export default function TimelogPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [data, setData] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'mes_heures' | 'equipe'>('mes_heures');

  const [teamData, setTeamData] = useState<any[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editForm, setEditForm] = useState({ heures: '', note: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const now = new Date();
  const [customFrom, setCustomFrom] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [customTo, setCustomTo] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  );

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    heures: '',
    category: '',
    note: '',
  });

  const getDateRange = (mode: ViewMode) => {
    const n = new Date();
    if (mode === 'week') {
      const day = n.getDay();
      const from = new Date(n);
      from.setDate(n.getDate() - (day === 0 ? 6 : day - 1));
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
    if (mode === 'month') return {
      from: new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0],
      to: new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0],
    };
    if (mode === 'year') return {
      from: new Date(n.getFullYear(), 0, 1).toISOString().split('T')[0],
      to: new Date(n.getFullYear(), 11, 31).toISOString().split('T')[0],
    };
    return { from: customFrom, to: customTo };
  };

  useEffect(() => {
    api.get('/timelog/catalog').then(r => setCatalog(r.data || []));
  }, []);

  useEffect(() => { fetchData(); }, [viewMode, customFrom, customTo]);
  useEffect(() => {
    if (activeTab === 'equipe') fetchTeamData();
  }, [activeTab, viewMode, customFrom, customTo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(viewMode);
      const res = await api.get('/timelog/me', { params: { from, to } });
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchTeamData = async () => {
    setLoadingTeam(true);
    try {
      const { from, to } = getDateRange(viewMode);
      const res = await api.get('/timelog/team', { params: { from, to } });
      setTeamData(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingTeam(false); }
  };

  const handleAdd = async () => {
    if (!form.category || !form.heures) return;
    setSaving(true);
    try {
      await api.post('/timelog/me', form);
      setShowAddModal(false);
      setForm({ date: new Date().toISOString().split('T')[0], heures: '', category: '', note: '' });
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (entryId: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      await api.delete(`/timelog/me/${entryId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleEdit = async () => {
    if (!editingEntry || !editForm.heures) return;
    setSavingEdit(true);
    try {
      await api.put(`/timelog/me/${editingEntry.id}`, {
        heures: parseFloat(editForm.heures),
        note: editForm.note,
      });
      setEditingEntry(null);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSavingEdit(false); }
  };

  const VIEW_MODES = [
    { id: 'week', label: 'Cette semaine' },
    { id: 'month', label: 'Ce mois' },
    { id: 'year', label: 'Cette année' },
    { id: 'custom', label: 'Personnalisé' },
  ];

  const { from, to } = getDateRange(viewMode);
  const summary = data?.summary;
  const allEntries = [
    ...(data?.timelogEntries || []).map((e: any) => ({
      ...e,
      source: 'timelog',
      label: e.categoryLabel || catalog.find((c: any) => c.key === e.category)?.label || e.category,
      isBillable: false,
    })),
    ...(data?.taskEntries || []).map((e: any) => ({
      ...e,
      source: 'task',
      label: e.taskTitle,
      isBillable: true,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <AppLayout>
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Gestion du temps
          </p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>Timelog</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          <Plus size={15} />
          Ajouter des heures
        </button>
      </div>

      {/* Onglets */}
      <div className="flex gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
        <button onClick={() => setActiveTab('mes_heures')}
          className="px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'mes_heures' ? '#C0392B' : '#F8F9FA',
            color: activeTab === 'mes_heures' ? '#FFFFFF' : '#6C757D',
            border: `1px solid ${activeTab === 'mes_heures' ? '#C0392B' : '#DEE2E6'}`,
          }}>
          ⏱ Mes heures
        </button>
        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <button onClick={() => setActiveTab('equipe')}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeTab === 'equipe' ? '#2C3E50' : '#F8F9FA',
              color: activeTab === 'equipe' ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${activeTab === 'equipe' ? '#2C3E50' : '#DEE2E6'}`,
            }}>
            👥 Vue équipe
          </button>
        )}
      </div>

      {/* Contrôles période */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {VIEW_MODES.map(m => (
          <button key={m.id} onClick={() => setViewMode(m.id as ViewMode)}
            className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              backgroundColor: viewMode === m.id ? '#2C3E50' : '#F8F9FA',
              color: viewMode === m.id ? '#FFFFFF' : '#6C757D',
              border: `1px solid ${viewMode === m.id ? '#2C3E50' : '#DEE2E6'}`,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Dates personnalisées */}
      {viewMode === 'custom' && (
        <div className="flex gap-4 mb-6 p-4 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Du</label>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-2 text-sm rounded"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Au</label>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-2 text-sm rounded"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
          </div>
        </div>
      )}

      {/* ── MES HEURES ── */}
      {activeTab === 'mes_heures' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
            </div>
          ) : (
            <>
              {/* Stats */}
              {summary && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Heures totales</p>
                    <p className="text-2xl font-black" style={{ color: '#2C3E50' }}>{summary.heuresTotal.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Facturable</p>
                    <p className="text-2xl font-black" style={{ color: '#27AE60' }}>{summary.heuresTaches.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Non facturable</p>
                    <p className="text-2xl font-black" style={{ color: '#F39C12' }}>{summary.heuresTimelog.toFixed(1)}h</p>
                  </div>
                  <div className="rounded-md p-4"
                    style={{
                      backgroundColor: summary.tempsCumule >= 0 ? '#EAFAF1' : '#FDEDEC',
                      border: `1px solid ${summary.tempsCumule >= 0 ? '#A9DFBF' : '#F1948A'}`,
                    }}>
                    <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>
                      Temps cumulé
                      <span className="ml-1 text-xs" style={{ color: '#ADB5BD' }}>
                        (objectif {summary.objectifPeriode}h)
                      </span>
                    </p>
                    <p className="text-2xl font-black"
                      style={{ color: summary.tempsCumule >= 0 ? '#27AE60' : '#C0392B' }}>
                      {summary.tempsCumule >= 0 ? '+' : ''}{summary.tempsCumule.toFixed(1)}h
                    </p>
                  </div>
                </div>
              )}

              {/* Liste entrées */}
              {allEntries.length === 0 ? (
                <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                  <p className="text-3xl mb-4">⏱</p>
                  <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune heure saisie pour cette période</p>
                  <button onClick={() => setShowAddModal(true)}
                    className="mt-4 text-white text-sm font-medium px-4 py-2 rounded"
                    style={{ backgroundColor: '#C0392B' }}>
                    + Ajouter des heures
                  </button>
                </div>
              ) : (
                <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
                  <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#F8F9FA' }}>
                        {['Date', 'Description', 'Type', 'Heures', ''].map(col => (
                          <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                            style={{ color: '#ADB5BD', borderBottom: '1px solid #E9ECEF' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allEntries.map((entry: any, idx: number) => (
                        <tr key={entry.id}
                          style={{ borderBottom: idx < allEntries.length - 1 ? '1px solid #F8F9FA' : 'none' }}>
                          <td className="px-4 py-3 text-xs" style={{ color: '#6C757D', whiteSpace: 'nowrap' }}>
                            {new Date(entry.date).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-3" style={{ color: '#2C3E50' }}>
                            <p className="text-sm">{entry.label}</p>
                            {entry.clientName && <p className="text-xs" style={{ color: '#ADB5BD' }}>{entry.clientName}</p>}
                            {entry.note && <p className="text-xs" style={{ color: '#ADB5BD' }}>{entry.note}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: entry.isBillable ? '#EAFAF1' : '#FEF9E7',
                                color: entry.isBillable ? '#27AE60' : '#F39C12',
                              }}>
                              {entry.isBillable ? '✓ Facturable' : '○ Non facturable'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold" style={{ color: '#2980B9' }}>
                            {entry.heures}h
                          </td>
                          <td className="px-3 py-3">
                            {entry.source === 'timelog' && (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => { setEditingEntry(entry); setEditForm({ heures: entry.heures.toString(), note: entry.note || '' }); }}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  ✏️
                                </button>
                                <button onClick={() => handleDelete(entry.id)}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {/* Total */}
                      <tr style={{ backgroundColor: '#F8F9FA' }}>
                        <td colSpan={3} className="px-4 py-3 text-xs font-bold text-right"
                          style={{ color: '#2C3E50', borderTop: '2px solid #E9ECEF' }}>
                          TOTAL
                        </td>
                        <td className="px-4 py-3 font-black" style={{ color: '#C0392B', borderTop: '2px solid #E9ECEF' }}>
                          {summary?.heuresTotal.toFixed(1)}h
                        </td>
                        <td style={{ borderTop: '2px solid #E9ECEF' }} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── VUE ÉQUIPE ── */}
      {activeTab === 'equipe' && (
        <>
          {loadingTeam ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teamData.map(member => (
                <div key={member.userId} className="rounded-md p-5"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${!member.aRempliSesHeures ? '#F1948A' : '#E9ECEF'}`,
                  }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: member.aRempliSesHeures ? '#27AE60' : '#C0392B' }}>
                        {member.userName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#2C3E50' }}>{member.userName}</p>
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>
                          Horaire : {member.horaireBase}h/sem · Objectif période : {member.objectifPeriode}h
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>Heures saisies</p>
                        <p className="font-black" style={{ color: '#2C3E50' }}>{member.heuresTotal.toFixed(1)}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>Facturable</p>
                        <p className="font-black" style={{ color: '#27AE60' }}>{member.heuresTaches.toFixed(1)}h</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#ADB5BD' }}>Temps cumulé</p>
                        <p className="font-black"
                          style={{ color: member.tempsCumule >= 0 ? '#27AE60' : '#C0392B' }}>
                          {member.tempsCumule >= 0 ? '+' : ''}{member.tempsCumule.toFixed(1)}h
                        </p>
                      </div>
                      {!member.aRempliSesHeures && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                          ⚠ Heures manquantes
                        </span>
                      )}
                      {member.aRempliSesHeures && (
                        <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: '#EAFAF1', color: '#27AE60', border: '1px solid #A9DFBF' }}>
                          ✓ Complet
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal ajout heures */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-lg p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#2C3E50' }}>
              Ajouter des heures non facturables
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Date</label>
                <input type="date" value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Catégorie</label>
                <select value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                  <option value="">Sélectionner une catégorie...</option>
                  {catalog.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Heures</label>
                <input type="number" value={form.heures}
                  onChange={e => setForm({ ...form, heures: e.target.value })}
                  placeholder="Ex: 1.5" min="0.25" step="0.25"
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Note (optionnel)</label>
                <input type="text" value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="Détails supplémentaires..."
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setForm({ date: new Date().toISOString().split('T')[0], heures: '', category: '', note: '' }); }}
                className="flex-1 py-2.5 rounded text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving || !form.category || !form.heures}
                className="flex-1 py-2.5 rounded text-sm text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {saving ? 'Sauvegarde...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal édition */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-lg p-6 w-full max-w-sm mx-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6' }}>
            <h2 className="text-base font-bold mb-1" style={{ color: '#2C3E50' }}>Modifier l'entrée</h2>
            <p className="text-xs mb-4" style={{ color: '#6C757D' }}>
              {catalog.find(c => c.key === editingEntry.category)?.label || editingEntry.category}
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Heures</label>
                <input type="number" value={editForm.heures}
                  onChange={e => setEditForm({ ...editForm, heures: e.target.value })}
                  min="0.25" step="0.25"
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Note</label>
                <input type="text" value={editForm.note}
                  onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Note optionnelle..."
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditingEntry(null)}
                className="flex-1 py-2.5 rounded text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={handleEdit} disabled={savingEdit || !editForm.heures}
                className="flex-1 py-2.5 rounded text-sm text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#2980B9' }}>
                {savingEdit ? 'Sauvegarde...' : 'Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}