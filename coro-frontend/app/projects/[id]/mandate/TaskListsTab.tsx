'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import api from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  a_faire:    { label: 'À faire',    color: '#2980B9', bg: '#EBF5FB' },
  en_cours:   { label: 'En cours',   color: '#F39C12', bg: '#FEF9E7' },
  en_attente: { label: 'En attente', color: '#95A5A6', bg: '#F8F9FA' },
  termine:    { label: 'Terminé',    color: '#27AE60', bg: '#EAFAF1' },
};

const CATEGORY_ORDER = [
  'PRÉPARATION',
  'OPÉRATION',
  'VÉRIFICATIONS INTERNES',
  'APPROBATION CLIENT',
  'MANUTENTION',
  'IMPRESSION / LIVRAISON / INSTALLATION',
  'ADMINISTRATION',
  'EXÉCUTION',
  'SUIVI',
  'LIVRAISON',
];

interface Props {
  projectId: string;
  teamMembers: any[];
}

export default function TaskListsTab({ projectId, teamMembers }: Props) {
  const [projectTaskLists, setProjectTaskLists] = useState<any[]>([]);
  const [availableLists, setAvailableLists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState('');
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedLists, setExpandedLists] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [timeModal, setTimeModal] = useState<any>(null);
  const [timeForm, setTimeForm] = useState({ date: new Date().toISOString().split('T')[0], heures: '', note: '' });
  const [savingTime, setSavingTime] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [listsRes, availableRes] = await Promise.all([
        api.get(`/task-lists/project/${projectId}`),
        api.get('/task-lists'),
      ]);
      const lists = listsRes.data || [];
      setProjectTaskLists(lists);
      setAvailableLists(availableRes.data || []);

      // Expand toutes les listes et catégories par défaut
      const expanded: Record<string, boolean> = {};
      const expandedCats: Record<string, boolean> = {};
      lists.forEach((l: any) => {
        expanded[l.id] = true;
        l.tasks?.forEach((t: any) => {
          expandedCats[`${l.id}-${t.categoryName}`] = true;
        });
      });
      setExpandedLists(expanded);
      setExpandedCategories(expandedCats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAddList = async () => {
    if (!selectedListId) return;
    setAdding(true);
    try {
      const selected = availableLists.find(l => l.id === selectedListId);
      await api.post(`/task-lists/${selectedListId}/import/${projectId}`, {
        customName: customName || selected?.name || 'Nouvelle liste',
      });
      setShowAddModal(false);
      setSelectedListId('');
      setCustomName('');
      fetchData();
    } catch (err) { console.error(err); }
    finally { setAdding(false); }
  };

  const handleRenameList = async (listId: string) => {
    if (!editingListName.trim()) return;
    try {
      await api.put(`/task-lists/project-list/${listId}`, { customName: editingListName });
      setEditingListId(null);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Supprimer cette liste et toutes ses tâches ?')) return;
    setDeletingListId(listId);
    try {
      await api.delete(`/task-lists/project-list/${listId}`);
      fetchData();
    } catch (err) { console.error(err); }
    finally { setDeletingListId(null); }
  };

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleDueDateChange = async (taskId: string, dueDate: string) => {
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { dueDate: dueDate || null });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleAssigneeChange = async (taskId: string, assigneeId: string) => {
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { assigneeId: assigneeId || null });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const handleRenameTask = async (taskId: string) => {
    if (!editingTaskTitle.trim()) return;
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}`, { taskTitle: editingTaskTitle });
      setEditingTaskId(null);
      fetchData();
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
      fetchData();
    } catch (err) { console.error(err); }
    finally { setSavingTime(false); }
  };

  const handleDeleteTime = async (entryId: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
      await api.delete(`/projects/${projectId}/time/${entryId}`);
      fetchData();
    } catch (err) { console.error(err); }
  };

  const groupTasksByCategory = (tasks: any[]) => {
    const grouped: Record<string, any[]> = {};
    tasks.forEach(t => {
      if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
      grouped[t.categoryName].push(t);
    });
    return Object.keys(grouped)
      .sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a);
        const ib = CATEGORY_ORDER.indexOf(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .map(cat => ({ category: cat, tasks: grouped[cat] }));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
    </div>
  );

  const totalTaches = projectTaskLists.reduce((sum, l) => sum + (l.tasks?.length || 0), 0);
  const totalTerminees = projectTaskLists.reduce((sum, l) =>
    sum + (l.tasks?.filter((t: any) => t.status === 'termine').length || 0), 0);
  const totalHeures = projectTaskLists.reduce((sum, l) =>
    sum + (l.tasks?.reduce((s: number, t: any) =>
      s + (t.timeEntries || []).reduce((se: number, e: any) => se + e.heures, 0), 0) || 0), 0);

  return (
    <div>
      {/* Stats globales */}
      {totalTaches > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Tâches terminées</p>
            <p className="text-2xl font-black" style={{ color: '#27AE60' }}>{totalTerminees}/{totalTaches}</p>
          </div>
          <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Heures saisies</p>
            <p className="text-2xl font-black" style={{ color: '#2980B9' }}>
              {Number(totalHeures).toFixed(2).replace(/\.?0+$/, '')}h
            </p>
          </div>
          <div className="rounded-md p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <p className="text-xs font-medium mb-1" style={{ color: '#6C757D' }}>Progression</p>
            <p className="text-2xl font-black" style={{ color: '#C0392B' }}>
              {totalTaches > 0 ? Math.round((totalTerminees / totalTaches) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Bouton ajouter une liste */}
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowAddModal(true)}
          className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          <Plus size={15} /> Ajouter une liste de tâches
        </button>
      </div>

      {/* Message si aucune liste */}
      {projectTaskLists.length === 0 && (
        <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-4xl mb-4">✅</p>
          <p className="text-sm font-medium mb-2" style={{ color: '#6C757D' }}>Aucune liste de tâches</p>
          <p className="text-xs mb-6" style={{ color: '#ADB5BD' }}>
            Ajoutez une liste de tâches pour commencer à suivre l'avancement du mandat
          </p>
          <button onClick={() => setShowAddModal(true)}
            className="text-white text-sm font-medium px-6 py-2.5 rounded"
            style={{ backgroundColor: '#C0392B' }}>
            + Ajouter une liste de tâches
          </button>
        </div>
      )}

      {/* Listes de tâches */}
      <div className="space-y-6">
        {projectTaskLists.map(list => {
          const isExpanded = expandedLists[list.id] !== false;
          const listTerminees = list.tasks?.filter((t: any) => t.status === 'termine').length || 0;
          const listTotal = list.tasks?.length || 0;
          const listHeures = list.tasks?.reduce((s: number, t: any) =>
            s + (t.timeEntries || []).reduce((se: number, e: any) => se + e.heures, 0), 0) || 0;
          const grouped = groupTasksByCategory(list.tasks || []);

          return (
            <div key={list.id} className="rounded-md overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

              {/* Header liste */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ backgroundColor: '#F8F9FA', borderBottom: isExpanded ? '1px solid #E9ECEF' : 'none' }}>
                <div className="flex items-center gap-3 flex-1">
                  <button onClick={() => setExpandedLists(prev => ({ ...prev, [list.id]: !prev[list.id] }))}>
                    {isExpanded
                      ? <ChevronUp size={16} style={{ color: '#6C757D' }} />
                      : <ChevronDown size={16} style={{ color: '#6C757D' }} />}
                  </button>

                  {editingListId === list.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={editingListName}
                        onChange={e => setEditingListName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameList(list.id); if (e.key === 'Escape') setEditingListId(null); }}
                        autoFocus
                        className="flex-1 px-2 py-1 text-sm rounded"
                        style={{ border: '1px solid #C0392B', color: '#2C3E50' }}
                      />
                      <button onClick={() => handleRenameList(list.id)}
                        className="p-1 rounded" style={{ color: '#27AE60' }}>
                        <Check size={14} />
                      </button>
                      <button onClick={() => setEditingListId(null)}
                        className="p-1 rounded" style={{ color: '#C0392B' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-bold text-sm" style={{ color: '#2C3E50' }}>
                        {list.customName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#EBF5FB', color: '#2980B9' }}>
                        {list.taskList?.name}
                      </span>
                      <button onClick={() => { setEditingListId(list.id); setEditingListName(list.customName); }}
                        className="p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: '#6C757D' }}>
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: '#6C757D' }}>
                    {listTerminees}/{listTotal} tâches
                  </span>
                  {listHeures > 0 && (
                    <span className="text-xs font-bold" style={{ color: '#2980B9' }}>
                      ⏱ {Number(listHeures).toFixed(2).replace(/\.?0+$/, '')}h
                    </span>
                  )}
                  <button
                    onClick={() => handleDeleteList(list.id)}
                    disabled={deletingListId === list.id}
                    className="p-1.5 rounded transition-colors disabled:opacity-50"
                    style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Catégories et tâches */}
              {isExpanded && (
                <div>
                  {grouped.map(({ category, tasks }) => {
                    const catKey = `${list.id}-${category}`;
                    const isCatExpanded = expandedCategories[catKey] !== false;
                    const catTerminees = tasks.filter(t => t.status === 'termine').length;

                    return (
                      <div key={category} style={{ borderBottom: '1px solid #F8F9FA' }}>
                        {/* Header catégorie */}
                        <button
                          onClick={() => setExpandedCategories(prev => ({ ...prev, [catKey]: !prev[catKey] }))}
                          className="w-full flex items-center justify-between px-5 py-2.5 transition-colors"
                          style={{ backgroundColor: '#FAFAFA' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F2F5'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FAFAFA'}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6C757D' }}>
                              {category}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: catTerminees === tasks.length ? '#EAFAF1' : '#EBF5FB',
                                color: catTerminees === tasks.length ? '#27AE60' : '#2980B9',
                              }}>
                              {catTerminees}/{tasks.length}
                            </span>
                          </div>
                          {isCatExpanded
                            ? <ChevronUp size={13} style={{ color: '#ADB5BD' }} />
                            : <ChevronDown size={13} style={{ color: '#ADB5BD' }} />}
                        </button>

                        {/* Tâches */}
                        {isCatExpanded && tasks.map((task, idx) => {
                          const status = STATUS_CONFIG[task.status] || STATUS_CONFIG['a_faire'];
                          const taskHeures = (task.timeEntries || []).reduce((s: number, e: any) => s + e.heures, 0);

                          return (
                            <div key={task.id}
                              style={{ borderBottom: idx < tasks.length - 1 ? '1px solid #F8F9FA' : 'none' }}>
                              <div className="flex items-center gap-3 px-5 py-3">
                                {/* Checkbox */}
                                <input type="checkbox"
                                  checked={task.status === 'termine'}
                                  onChange={e => handleStatusChange(task.id, e.target.checked ? 'termine' : 'a_faire')}
                                  style={{ accentColor: '#27AE60', width: '16px', height: '16px', flexShrink: 0 }} />

                                {/* Titre éditable */}
                                {editingTaskId === task.id ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <input
                                      type="text"
                                      value={editingTaskTitle}
                                      onChange={e => setEditingTaskTitle(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleRenameTask(task.id); if (e.key === 'Escape') setEditingTaskId(null); }}
                                      autoFocus
                                      className="flex-1 px-2 py-1 text-sm rounded"
                                      style={{ border: '1px solid #C0392B', color: '#2C3E50' }}
                                    />
                                    <button onClick={() => handleRenameTask(task.id)} style={{ color: '#27AE60' }}>
                                      <Check size={14} />
                                    </button>
                                    <button onClick={() => setEditingTaskId(null)} style={{ color: '#C0392B' }}>
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    className="flex-1 text-sm cursor-pointer"
                                    style={{
                                      color: task.status === 'termine' ? '#ADB5BD' : '#2C3E50',
                                      textDecoration: task.status === 'termine' ? 'line-through' : 'none',
                                    }}
                                    onDoubleClick={() => { setEditingTaskId(task.id); setEditingTaskTitle(task.taskTitle); }}
                                    title="Double-cliquer pour modifier">
                                    {task.taskTitle}
                                  </span>
                                )}

                                {/* Heures */}
                                {taskHeures > 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded"
                                    style={{ backgroundColor: '#EBF5FB', color: '#2980B9' }}>
                                    ⏱ {Number(taskHeures).toFixed(2).replace(/\.?0+$/, '')}h
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

                                {/* Bouton temps */}
                                <button onClick={() => setTimeModal(task)}
                                  className="text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors"
                                  style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Plus size={11} /> Temps
                                </button>

                                {/* Assigné */}
                                <select
                                  value={task.assigneeId || ''}
                                  onChange={e => handleAssigneeChange(task.id, e.target.value)}
                                  className="text-xs px-2 py-1 rounded"
                                  style={{ border: '1px solid #DEE2E6', color: '#6C757D', maxWidth: '130px' }}>
                                  <option value="">— Assigné —</option>
                                  {teamMembers.map((m: any) => (
                                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                                  ))}
                                </select>
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
                                        <span className="font-bold" style={{ color: '#2980B9' }}>
                                          {Number(entry.heures).toFixed(2).replace(/\.?0+$/, '')}h
                                        </span>
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
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal ajout liste */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-lg p-6 w-full max-w-md mx-4"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6' }}>
            <h2 className="text-base font-bold mb-4" style={{ color: '#2C3E50' }}>
              Ajouter une liste de tâches
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                  Type de liste
                </label>
                <select value={selectedListId}
                  onChange={e => {
                    setSelectedListId(e.target.value);
                    const selected = availableLists.find(l => l.id === e.target.value);
                    setCustomName(selected?.name || '');
                  }}
                  className="w-full px-3 py-2.5 text-sm rounded"
                  style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                  <option value="">Sélectionner un type...</option>
                  {availableLists.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l._count?.templates || l.templates?.length || 0} tâches)
                    </option>
                  ))}
                </select>
              </div>
              {selectedListId && (
                <div>
                  <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                    Nom personnalisé
                  </label>
                  <input type="text" value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Ex: Formation A — Tour CIBC"
                    className="w-full px-3 py-2.5 text-sm rounded"
                    style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
                  <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                    Personnalisez le nom pour identifier cette instance
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setSelectedListId(''); setCustomName(''); }}
                className="flex-1 py-2.5 rounded text-sm"
                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                Annuler
              </button>
              <button onClick={handleAddList} disabled={adding || !selectedListId}
                className="flex-1 py-2.5 rounded text-sm text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: '#C0392B' }}>
                {adding ? 'Ajout...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal saisie temps */}
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