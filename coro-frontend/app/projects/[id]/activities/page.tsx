'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Trash2, Download, Copy } from 'lucide-react';
import api from '@/lib/api';

const ACTIVITY_CATALOG = [
  { type: 'creation_document', label: 'Création ou mise à jour de document (PMU/PSI/PUE/PGC...)', duration: 'Variable', mode: 'presentiel' },
  { type: 'formation_equipe_urgence', label: 'Formation pour équipe d\'urgence', duration: '2h30 – 3h00', mode: 'presentiel' },
  { type: 'formation_equipe_urgence_exercice', label: 'Formation pour équipe d\'urgence + exercice simulé', duration: '3h00 – 3h30', mode: 'presentiel' },
  { type: 'formation_travail_chaud', label: 'Formation travail à chaud', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_coordonnateur', label: 'Formation aux coordonnateurs d\'urgence', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_epi', label: 'Formation équipe de première intervention (EPI)', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_communication', label: 'Formation communication d\'urgence', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_comportement', label: 'Formation comportement et attitude en situation d\'urgence', duration: '2h00', mode: 'presentiel' },
  { type: 'formation_locataires', label: 'Formation aux locataires', duration: '1h00', mode: 'teams' },
  { type: 'exercice_table', label: 'Exercice de table', duration: '2h00', mode: 'teams' },
  { type: 'exercice_evacuation', label: 'Exercice d\'évacuation annuel', duration: '3h00', mode: 'presentiel' },
  { type: 'autre', label: 'Autre', duration: '', mode: 'presentiel' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_faire:  { label: 'À faire',  color: '#2980B9', bg: '#EBF5FB' },
  fait:     { label: 'Fait',     color: '#27AE60', bg: '#EAFAF1' },
  reporte:  { label: 'Reporté',  color: '#E67E22', bg: '#FEF9E7' },
  annule:   { label: 'Annulé',   color: '#95A5A6', bg: '#F8F9FA' },
  termine:  { label: 'Terminé',  color: '#1A5276', bg: '#D6EAF8' },
};

export default function ActivitiesPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [activities, setActivities] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [reportModal, setReportModal] = useState<any>(null);
  const [duplicating, setDuplicating] = useState(false);

  const [form, setForm] = useState({
    type: '',
    customLabel: '',
    customDuration: '',
    mode: 'presentiel',
    scheduledDate: '',
    assigneeEmail: '',
    clientEmails: [''],
    notes: '',
  });

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    try {
      const [projectRes, activitiesRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/activities`),
      ]);
      setProject(projectRes.data);
      setActivities(activitiesRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resetForm = () => setForm({
    type: '', customLabel: '', customDuration: '', mode: 'presentiel',
    scheduledDate: '', assigneeEmail: '', clientEmails: [''], notes: '',
  });

  const handleAddActivity = async () => {
    if (!form.type) return;
    const catalog = ACTIVITY_CATALOG.find(a => a.type === form.type);
    try {
      await api.post(`/projects/${projectId}/activities`, {
        type: form.type,
        label: form.type === 'autre' ? (form.customLabel || 'Autre') : (catalog?.label || ''),
        duration: form.type === 'autre' ? form.customDuration : (catalog?.duration || ''),
        mode: form.mode,
        customLabel: form.type === 'autre' ? form.customLabel : null,
        customDuration: form.type === 'autre' ? form.customDuration : null,
        scheduledDate: form.scheduledDate || null,
        assigneeEmail: form.assigneeEmail || null,
        clientEmail: form.clientEmails.filter(e => e.trim()).join(','),
        notes: form.notes || null,
      });
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (activity: any, newStatus: string) => {
    if (newStatus === 'reporte') { setReportModal(activity); return; }
    try {
      await api.put(`/activities/${activity.id}`, { status: newStatus });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleReportSubmit = async (newDate: string) => {
    if (!reportModal || !newDate) return;
    try {
      await api.put(`/activities/${reportModal.id}`, { status: 'reporte', reportedDate: newDate });
      setReportModal(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (activityId: string) => {
    if (!confirm('Supprimer cette activité ?')) return;
    try {
      await api.delete(`/activities/${activityId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDownloadIcs = (activityId: string, label: string) => {
    const token = localStorage.getItem('coro_token');
    fetch(`http://localhost:3002/api/activities/${activityId}/ics`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const handleDuplicate = async () => {
    if (!confirm('Dupliquer toutes les activités pour l\'année suivante (+12 mois) ?')) return;
    setDuplicating(true);
    try {
      await api.post(`/projects/${projectId}/activities/duplicate`);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setDuplicating(false); }
  };

  const done = activities.filter(a => a.status === 'termine').length;
  const total = activities.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>

      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-40"
        style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DEE2E6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold cursor-pointer" style={{ color: '#2C3E50' }}
            onClick={() => router.push('/dashboard')}>
            CO<span style={{ color: '#C0392B' }}>RO</span>
          </h1>
          <span style={{ color: '#DEE2E6' }}>|</span>
          <span className="text-sm cursor-pointer" style={{ color: '#6C757D' }}
            onClick={() => router.push(`/projects/${projectId}`)}>
            {project?.name}
          </span>
          <span style={{ color: '#DEE2E6' }}>|</span>
          <span className="text-sm font-medium" style={{ color: '#C0392B' }}>Activités annuelles</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleDuplicate} disabled={duplicating || activities.length === 0}
            className="text-sm px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <Copy size={14} />
            {duplicating ? 'Duplication...' : 'Dupliquer pour l\'an prochain'}
          </button>
          <button onClick={() => setShowAddModal(true)}
            className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            <Plus size={15} />
            Ajouter une activité
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Progression */}
        {total > 0 && (
          <div className="rounded-md p-5 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ADB5BD' }}>Progression annuelle</p>
                <p className="text-2xl font-black" style={{ color: '#2C3E50' }}>{done}/{total} activités terminées</p>
              </div>
              <span className="text-3xl font-black"
                style={{ color: pct === 100 ? '#27AE60' : pct > 50 ? '#F39C12' : '#C0392B' }}>
                {pct}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ backgroundColor: '#E9ECEF' }}>
              <div className="h-2 rounded-full transition-all" style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? '#27AE60' : pct > 50 ? '#F39C12' : '#C0392B',
              }} />
            </div>
          </div>
        )}

        {/* Liste activités */}
        {activities.length === 0 ? (
          <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-4xl mb-4">📅</p>
            <p className="text-sm font-medium" style={{ color: '#6C757D' }}>Aucune activité planifiée</p>
            <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>Cliquez sur "Ajouter une activité" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => {
              const status = STATUS_CONFIG[activity.status] || STATUS_CONFIG['a_faire'];
              const label = activity.customLabel || activity.label;
              return (
                <div key={activity.id} className="rounded-md p-4"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold" style={{ color: '#2C3E50' }}>{label}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: activity.mode === 'teams' ? '#EBF5FB' : '#EAFAF1', color: activity.mode === 'teams' ? '#2980B9' : '#27AE60' }}>
                          {activity.mode === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                        </span>
                        {activity.duration && (
                          <span className="text-xs" style={{ color: '#ADB5BD' }}>⏱ {activity.duration}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: '#6C757D' }}>
                        {activity.scheduledDate && (
                          <span>📅 {new Date(activity.scheduledDate).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        )}
                        {activity.assigneeEmail && <span>👤 {activity.assigneeEmail}</span>}
                        {activity.clientEmail && <span>🏢 {activity.clientEmail}</span>}
                      </div>
                      {activity.notes && (
                        <p className="text-xs mt-1" style={{ color: '#6C757D' }}>{activity.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select value={activity.status}
                        onChange={e => handleStatusChange(activity, e.target.value)}
                        className="text-xs px-2 py-1.5 rounded font-medium border-0 outline-none cursor-pointer"
                        style={{ backgroundColor: status.bg, color: status.color }}>
                        {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                      {activity.scheduledDate && (
                        <button onClick={() => handleDownloadIcs(activity.id, label)}
                          className="p-1.5 rounded transition-colors"
                          title="Télécharger invitation Outlook (.ics)"
                          style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <Download size={14} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(activity.id)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal ajout activité */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-lg p-6 w-full max-w-lg mx-4 overflow-y-auto"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', maxHeight: '90vh' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#2C3E50' }}>Ajouter une activité</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Type d'activité</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                  <option value="">Sélectionner...</option>
                  {ACTIVITY_CATALOG.map(a => (
                    <option key={a.type} value={a.type}>{a.label} {a.duration ? `(${a.duration})` : ''}</option>
                  ))}
                </select>
              </div>

              {form.type === 'autre' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Nom de l'activité</label>
                    <input type="text" value={form.customLabel}
                      onChange={e => setForm({ ...form, customLabel: e.target.value })}
                      placeholder="Ex: Formation spécifique client..."
                      className="w-full px-3 py-2.5 text-sm rounded"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Durée</label>
                    <input type="text" value={form.customDuration}
                      onChange={e => setForm({ ...form, customDuration: e.target.value })}
                      placeholder="Ex: 2h00"
                      className="w-full px-3 py-2.5 text-sm rounded"
                      style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
                  </div>
                </>
              )}

              {form.type && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Mode de livraison</label>
                  <div className="flex gap-3">
                    {['presentiel', 'teams'].map(m => (
                      <button key={m} onClick={() => setForm({ ...form, mode: m })}
                        className="flex-1 py-2 rounded text-sm font-medium transition-colors"
                        style={{
                          backgroundColor: form.mode === m ? (m === 'teams' ? '#EBF5FB' : '#EAFAF1') : '#F8F9FA',
                          color: form.mode === m ? (m === 'teams' ? '#2980B9' : '#27AE60') : '#6C757D',
                          border: `1px solid ${form.mode === m ? (m === 'teams' ? '#AED6F1' : '#A9DFBF') : '#DEE2E6'}`,
                        }}>
                        {m === 'teams' ? '💻 Teams' : '📍 Présentiel'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Date prévue</label>
                <input type="date" value={form.scheduledDate}
                  onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Courriel conseiller</label>
                <input type="email" value={form.assigneeEmail}
                  onChange={e => setForm({ ...form, assigneeEmail: e.target.value })}
                  placeholder="conseiller@votreorganisation.com"
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Courriels client(s)</label>
                <div className="space-y-2">
                  {form.clientEmails.map((email, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input type="email" value={email}
                        onChange={e => {
                          const updated = [...form.clientEmails];
                          updated[idx] = e.target.value;
                          setForm({ ...form, clientEmails: updated });
                        }}
                        placeholder="contact@client.com"
                        className="w-full px-3 py-2 text-sm rounded"
                        style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
                      {form.clientEmails.length > 1 && (
                        <button
                          onClick={() => {
                            const updated = form.clientEmails.filter((_, i) => i !== idx);
                            setForm({ ...form, clientEmails: updated });
                          }}
                          className="flex-shrink-0 px-2 py-1.5 rounded text-xs"
                          style={{ color: '#C0392B', border: '1px solid #F1948A' }}>
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setForm({ ...form, clientEmails: [...form.clientEmails, ''] })}
                    className="text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors"
                    style={{ color: '#2980B9', border: '1px solid transparent' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EBF5FB'; e.currentTarget.style.borderColor = '#AED6F1'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                    + Ajouter un courriel
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2} placeholder="Notes ou informations supplémentaires..."
                  className="w-full px-3 py-2 text-sm rounded resize-none"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 py-2.5 rounded text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={handleAddActivity} disabled={!form.type}
                className="flex-1 py-2.5 rounded text-sm text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reporté */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-lg p-6 w-full max-w-sm mx-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6' }}>
            <h2 className="text-base font-bold mb-2" style={{ color: '#2C3E50' }}>Activité reportée</h2>
            <p className="text-sm mb-4" style={{ color: '#6C757D' }}>Sélectionnez la nouvelle date :</p>
            <input type="date" id="reportDate"
              className="w-full px-3 py-2.5 text-sm rounded mb-4"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
            <div className="flex gap-3">
              <button onClick={() => setReportModal(null)}
                className="flex-1 py-2.5 rounded text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={() => {
                const date = (document.getElementById('reportDate') as HTMLInputElement)?.value;
                handleReportSubmit(date);
              }}
                className="flex-1 py-2.5 rounded text-sm text-white font-medium"
                style={{ backgroundColor: '#E67E22' }}>
                Confirmer le report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}