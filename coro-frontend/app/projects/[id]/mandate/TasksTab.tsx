'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_faire:    { label: 'À faire',    color: '#2980B9', bg: '#EBF5FB' },
  en_cours:   { label: 'En cours',   color: '#F39C12', bg: '#FEF9E7' },
  en_attente: { label: 'En attente', color: '#95A5A6', bg: '#F8F9FA' },
  termine:    { label: 'Terminé',    color: '#27AE60', bg: '#EAFAF1' },
};

interface Props {
  projectId: string;
  documentType: string;
}

export default function TasksTab({ projectId, documentType }: Props) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [timeModal, setTimeModal] = useState<any>(null);
  const [timeForm, setTimeForm] = useState({ date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => { fetchTasks(); }, [projectId]);

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/tasks`);
      const taskList = res.data || [];
      setTasks(taskList);

      // Expand toutes les catégories par défaut
      const cats: Record<string, boolean> = {};
      taskList.forEach((t: any) => { cats[t.categoryName] = true; });
      setExpandedCategories(cats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleInit = async () => {
    setInitializing(true);
    try {
      await api.post(`/projects/${projectId}/tasks/init`, { documentType });
      fetchTasks();
    } catch (err) { console.error(err); }
    finally { setInitializing(false); }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleDueDateChange = async (taskId: string, dueDate: string) => {
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { dueDate: dueDate || null });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleAddTime = async () => {
    if (!timeModal || !timeForm.heures) return;
    setSavingTime(true);
    try {
      await api.post(`/projects/${projectId}/tasks/${timeModal.id}/time`, {
        date: timeForm.date,
        heures: parseFloat(timeForm.heures),
        note: timeForm.note || null,
      });
      setTimeModal(null);
      setTimeForm({ date: new Date().toISOString().split('T')[0], heures: '', note: '' });
      fetchTasks();
    } catch (err) { console.error(err); }
    finally { setSavingTime(false); }
  };

  const handleDeleteTime = async (entryId: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      await api.delete(`/projects/${projectId}/time/${entryId}`);
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const CATEGORY_ORDER = [
    'PRÉPARATION',
    'OPÉRATION',
    'VÉRIFICATIONS INTERNES',
    'APPROBATION CLIENT',
    'MANUTENTION',
    'ADMINISTRATION',
  ];

  // Grouper par catégorie
  const grouped: Record<string, any[]> = {};
  tasks.forEach(t => {
    if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
    grouped[t.categoryName].push(t);
  });

  // Trier les catégories selon l'ordre défini
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const idxA = CATEGORY_ORDER.indexOf(a);
    const idxB = CATEGORY_ORDER.indexOf(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const totalHeures = tasks.reduce((sum, t) =>
    sum + (t.timeEntries || []).reduce((s: number, e: any) => s + e.heures, 0), 0);

  const totalTerminees = tasks.filter(t => t.status === 'termine').length;

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement des tâches...</p>
    </div>
  );

  if (tasks.length === 0) return (
    <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
      <p className="text-4xl mb-4">✅</p>
      <p className="text-sm font-medium mb-2" style={{ color: '#6C757D' }}>Aucune tâche initialisée</p>
      <p className="text-xs mb-6" style={{ color: '#ADB5BD' }}>
        Générez les tâches standard pour un {documentType} automatiquement
      </p>
      <button onClick={handleInit} disabled={initializing}
        className="text-white text-sm font-medium px-6 py-2.5 rounded disabled:opacity-50"
        style={{ backgroundColor: '#C0392B' }}>
        {initializing ? 'Initialisation...' : `⚡ Initialiser les tâches ${documentType}`}
      </button>
    </div>
  );

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Tâches terminées</p>
          <p className="text-2xl font-black" style={{ color: '#27AE60' }}>{totalTerminees}/{tasks.length}</p>
        </div>
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Heures saisies</p>
          <p className="text-2xl font-black" style={{ color: '#2980B9' }}>{totalHeures.toFixed(1)}h</p>
        </div>
        <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Progression</p>
          <p className="text-2xl font-black" style={{ color: '#C0392B' }}>
            {tasks.length > 0 ? Math.round((totalTerminees / tasks.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Tâches par catégorie */}
      <div className="space-y-4">
        {sortedCategories.map(category => {
          const categoryTasks = grouped[category];
          const isExpanded = expandedCategories[category] !== false;
          const catTerminees = categoryTasks.filter(t => t.status === 'termine').length;

          return (
            <div key={category} className="rounded-md overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

              {/* Header catégorie */}
              <button
                onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                className="w-full flex items-center justify-between px-5 py-3 transition-colors"
                style={{ backgroundColor: '#F8F9FA', borderBottom: isExpanded ? '1px solid #E9ECEF' : 'none' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F2F5'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold uppercase tracking-wide" style={{ color: '#2C3E50' }}>
                    {category}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: catTerminees === categoryTasks.length ? '#EAFAF1' : '#EBF5FB',
                      color: catTerminees === categoryTasks.length ? '#27AE60' : '#2980B9',
                    }}>
                    {catTerminees}/{categoryTasks.length}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={16} style={{ color: '#6C757D' }} /> : <ChevronDown size={16} style={{ color: '#6C757D' }} />}
              </button>

              {/* Tâches */}
              {isExpanded && (
                <div>
                  {categoryTasks.map((task, idx) => {
                    const status = STATUS_CONFIG[task.status] || STATUS_CONFIG['a_faire'];
                    const taskHeures = (task.timeEntries || []).reduce((s: number, e: any) => s + e.heures, 0);

                    return (
                      <div key={task.id}
                        style={{ borderBottom: idx < categoryTasks.length - 1 ? '1px solid #F8F9FA' : 'none' }}>

                        {/* Ligne tâche */}
                        <div className="flex items-center gap-3 px-5 py-3">
                          {/* Checkbox */}
                          <input type="checkbox"
                            checked={task.status === 'termine'}
                            onChange={e => handleStatusChange(task.id, e.target.checked ? 'termine' : 'a_faire')}
                            style={{ accentColor: '#27AE60', width: '16px', height: '16px', flexShrink: 0 }} />

                          {/* Titre */}
                          <span className="flex-1 text-sm"
                            style={{
                              color: task.status === 'termine' ? '#ADB5BD' : '#2C3E50',
                              textDecoration: task.status === 'termine' ? 'line-through' : 'none',
                            }}>
                            {task.taskTitle}
                          </span>

                          {/* Heures saisies */}
                          {taskHeures > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded"
                              style={{ backgroundColor: '#EBF5FB', color: '#2980B9' }}>
                              ⏱ {taskHeures.toFixed(1)}h
                            </span>
                          )}

                          {/* Statut */}
                          <select value={task.status}
                            onChange={e => handleStatusChange(task.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded font-medium border-0 outline-none cursor-pointer"
                            style={{ backgroundColor: status.bg, color: status.color }}>
                            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                              <option key={key} value={key}>{val.label}</option>
                            ))}
                          </select>

                          {/* Date prévue */}
                          <input type="date"
                            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                            onChange={e => handleDueDateChange(task.id, e.target.value)}
                            className="text-xs px-2 py-1 rounded"
                            style={{ border: '1px solid #DEE2E6', color: '#6C757D', fontSize: '11px' }} />

                          {/* Bouton + Temps */}
                          <button onClick={() => setTimeModal(task)}
                            className="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                            style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                            <Plus size={11} /> Temps
                          </button>
                        </div>

                        {/* Entrées de temps */}
                        {task.timeEntries?.length > 0 && (
                          <div className="px-5 pb-3 ml-7">
                            <div className="rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                              {task.timeEntries.map((entry: any) => (
                                <div key={entry.id}
                                  className="flex items-center justify-between px-3 py-2 text-xs"
                                  style={{ borderBottom: '1px solid #E9ECEF' }}>
                                  <span style={{ color: '#6C757D' }}>
                                    {new Date(entry.date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                  </span>
                                  <span className="font-bold" style={{ color: '#2980B9' }}>{entry.heures}h</span>
                                  <span style={{ color: '#ADB5BD' }}>
                                    {entry.user?.firstName} {entry.user?.lastName}
                                  </span>
                                  {entry.note && <span style={{ color: '#6C757D' }}>{entry.note}</span>}
                                  <button onClick={() => handleDeleteTime(entry.id)}
                                    style={{ color: '#F1948A' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                                    onMouseLeave={e => e.currentTarget.style.color = '#F1948A'}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal saisie de temps */}
      {timeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-lg p-6 w-full max-w-sm mx-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6' }}>
            <h2 className="text-base font-bold mb-1" style={{ color: '#2C3E50' }}>Saisir des heures</h2>
            <p className="text-xs mb-4" style={{ color: '#6C757D' }}>{timeModal.taskTitle}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Date</label>
                <input type="date" value={timeForm.date}
                  onChange={e => setTimeForm({ ...timeForm, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Heures</label>
                <input type="number" value={timeForm.heures}
                  onChange={e => setTimeForm({ ...timeForm, heures: e.target.value })}
                  placeholder="Ex: 1.5" min="0.25" step="0.25"
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Note (optionnel)</label>
                <input type="text" value={timeForm.note}
                  onChange={e => setTimeForm({ ...timeForm, note: e.target.value })}
                  placeholder="Ex: Appel téléphonique..."
                  className="w-full px-3 py-2 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => { setTimeModal(null); setTimeForm({ date: new Date().toISOString().split('T')[0], heures: '', note: '' }); }}
                className="flex-1 py-2.5 rounded text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={handleAddTime} disabled={savingTime || !timeForm.heures}
                className="flex-1 py-2.5 rounded text-sm text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#2980B9' }}>
                {savingTime ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}