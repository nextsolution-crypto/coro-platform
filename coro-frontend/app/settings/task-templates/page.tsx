'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

const DOCUMENT_TYPES = ['PMU', 'PSI', 'PCA', 'PGC', 'PRA', 'PUE'];

const CATEGORY_ORDER = [
  'PRÉPARATION',
  'OPÉRATION',
  'VÉRIFICATIONS INTERNES',
  'APPROBATION CLIENT',
  'MANUTENTION',
  'ADMINISTRATION',
];

export default function OrgTaskTemplatesPage() {
  const [globalTemplates, setGlobalTemplates] = useState<any[]>([]);
  const [orgTemplates, setOrgTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeView, setActiveView] = useState<'org' | 'global'>('org');
  const [newTask, setNewTask] = useState({
    categoryName: 'PRÉPARATION',
    taskTitle: '',
    documentTypes: [] as string[],
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const [orgRes, globalRes] = await Promise.all([
        api.get('/task-templates/my'),
        api.get('/task-templates'),
      ]);
      setOrgTemplates(orgRes.data?.templates || []);
      setGlobalTemplates(globalRes.data?.templates || []);

      const cats: Record<string, boolean> = {};
      CATEGORY_ORDER.forEach(c => { cats[c] = true; });
      setExpandedCategories(cats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newTask.taskTitle.trim()) return;
    setSaving(true);
    try {
      await api.post('/task-templates/my', newTask);
      setNewTask({ categoryName: 'PRÉPARATION', taskTitle: '', documentTypes: [], order: 0 });
      setShowAddForm(false);
      fetchTemplates();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEdit = async (id: string) => {
    try {
      await api.put(`/task-templates/${id}`, editingData);
      setEditingId(null);
      setEditingData({});
      fetchTemplates();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return;
    try {
      await api.delete(`/task-templates/${id}`);
      fetchTemplates();
    } catch (err) { console.error(err); }
  };

  const toggleDocType = (types: string[], type: string) =>
    types.includes(type) ? types.filter(t => t !== type) : [...types, type];

  const getGrouped = (templates: any[]) => {
    const grouped: Record<string, any[]> = {};
    templates.forEach(t => {
      if (!grouped[t.categoryName]) grouped[t.categoryName] = [];
      grouped[t.categoryName].push(t);
    });
    return grouped;
  };

  const currentTemplates = activeView === 'org' ? orgTemplates : globalTemplates;
  const grouped = getGrouped(currentTemplates);
  const sortedCategories = [
    ...CATEGORY_ORDER.filter(c => grouped[c]),
    ...Object.keys(grouped).filter(c => !CATEGORY_ORDER.includes(c)),
  ];

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>Paramètres</p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>Templates de tâches</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        {activeView === 'org' && (
          <button onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto justify-center text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            <Plus size={15} />
            Ajouter une tâche
          </button>
        )}
      </div>

      {/* Onglets vue */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <button onClick={() => setActiveView('org')}
          className="w-full sm:w-auto px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeView === 'org' ? '#C0392B' : '#F8F9FA',
            color: activeView === 'org' ? '#FFFFFF' : '#6C757D',
            border: `1px solid ${activeView === 'org' ? '#C0392B' : '#DEE2E6'}`,
          }}>
          Mes tâches personnalisées
          {orgTemplates.length > 0 && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: activeView === 'org' ? 'rgba(255,255,255,0.3)' : '#FDEDEC', color: activeView === 'org' ? '#FFFFFF' : '#C0392B' }}>
              {orgTemplates.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveView('global')}
          className="w-full sm:w-auto px-4 py-2 rounded text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeView === 'global' ? '#2C3E50' : '#F8F9FA',
            color: activeView === 'global' ? '#FFFFFF' : '#6C757D',
            border: `1px solid ${activeView === 'global' ? '#2C3E50' : '#DEE2E6'}`,
          }}>
          Tâches CORO par défaut
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: activeView === 'global' ? 'rgba(255,255,255,0.2)' : '#F8F9FA', color: activeView === 'global' ? '#FFFFFF' : '#ADB5BD' }}>
            {globalTemplates.length}
          </span>
        </button>
      </div>

      {/* Info */}
      {activeView === 'org' && orgTemplates.length === 0 && !showAddForm && (
        <div className="rounded-md p-4 sm:p-5 mb-6"
          style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
          <p className="text-sm font-medium mb-1" style={{ color: '#2980B9' }}>ℹ️ Aucun template personnalisé</p>
          <p className="text-xs" style={{ color: '#1A5276' }}>
            Vos projets utilisent les tâches CORO par défaut. Ajoutez vos propres tâches pour personnaliser le flux de travail de votre organisation.
            Vos tâches personnalisées remplaceront les tâches par défaut lors de l'initialisation d'un projet.
          </p>
        </div>
      )}

      {activeView === 'global' && (
        <div className="rounded-md p-4 mb-6"
          style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
          <p className="text-xs" style={{ color: '#7D6608' }}>
            ⚠️ Ces tâches sont gérées par CORO et s'appliquent à toutes les organisations. Vous ne pouvez pas les modifier ici.
            Pour personnaliser, utilisez l'onglet "Mes tâches personnalisées".
          </p>
        </div>
      )}

      {/* Formulaire ajout */}
      {showAddForm && activeView === 'org' && (
        <div className="rounded-md p-5 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #AED6F1' }}>
          <h2 className="font-semibold mb-4 text-sm" style={{ color: '#2C3E50' }}>Nouvelle tâche personnalisée</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Catégorie</label>
              <select value={newTask.categoryName}
                onChange={e => setNewTask({ ...newTask, categoryName: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>
                {CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="AUTRE">AUTRE</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Ordre</label>
              <input type="number" value={newTask.order}
                onChange={e => setNewTask({ ...newTask, order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-sm rounded"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>Titre de la tâche</label>
            <input type="text" value={newTask.taskTitle}
              onChange={e => setNewTask({ ...newTask, taskTitle: e.target.value })}
              placeholder="Ex: Envoi du rapport mensuel au client"
              className="w-full px-3 py-2 text-sm rounded"
              style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6C757D' }}>Types de documents</label>
            <div className="flex gap-2 flex-wrap">
              {DOCUMENT_TYPES.map(type => (
                <button key={type}
                  onClick={() => setNewTask({ ...newTask, documentTypes: toggleDocType(newTask.documentTypes, type) })}
                  className="px-3 py-1 rounded text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: newTask.documentTypes.includes(type) ? '#C0392B' : '#F8F9FA',
                    color: newTask.documentTypes.includes(type) ? '#FFFFFF' : '#6C757D',
                    border: `1px solid ${newTask.documentTypes.includes(type) ? '#C0392B' : '#DEE2E6'}`,
                  }}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
              Annuler
            </button>
            <button onClick={handleAdd} disabled={saving || !newTask.taskTitle.trim()}
              className="px-4 py-2 rounded text-sm text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: '#C0392B' }}>
              {saving ? 'Sauvegarde...' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Liste templates */}
      {currentTemplates.length === 0 && !showAddForm ? (
        <div className="text-center py-16 rounded-md" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-3xl mb-4">✅</p>
          <p className="text-sm" style={{ color: '#6C757D' }}>Aucun template personnalisé pour le moment</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedCategories.map(category => {
            const categoryTasks = grouped[category] || [];
            const isExpanded = expandedCategories[category] !== false;

            return (
              <div key={category} className="rounded-md overflow-hidden"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

                <button
                  onClick={() => setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }))}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 transition-colors"
                  style={{ backgroundColor: '#F8F9FA', borderBottom: isExpanded ? '1px solid #E9ECEF' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F0F2F5'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                    <span className="text-sm font-bold uppercase tracking-wide break-words" style={{ color: '#2C3E50' }}>{category}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#EBF5FB', color: '#2980B9' }}>
                      {categoryTasks.length} tâche{categoryTasks.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} style={{ color: '#6C757D' }} /> : <ChevronDown size={16} style={{ color: '#6C757D' }} />}
                </button>

                {isExpanded && (
                  <div>
                    {categoryTasks.map((task, idx) => (
                      <div key={task.id} className="px-4 sm:px-5 py-3"
                        style={{ borderBottom: idx < categoryTasks.length - 1 ? '1px solid #F8F9FA' : 'none' }}>

                        {editingId === task.id ? (
                          <div className="space-y-3">
                            <input type="text" value={editingData.taskTitle}
                              onChange={e => setEditingData({ ...editingData, taskTitle: e.target.value })}
                              className="w-full px-3 py-2 text-sm rounded"
                              style={{ border: '1px solid #C0392B', color: '#2C3E50' }} />
                            <div className="flex gap-2 flex-wrap">
                              {DOCUMENT_TYPES.map(type => (
                                <button key={type}
                                  onClick={() => setEditingData({ ...editingData, documentTypes: toggleDocType(editingData.documentTypes, type) })}
                                  className="px-2.5 py-1 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: editingData.documentTypes?.includes(type) ? '#C0392B' : '#F8F9FA',
                                    color: editingData.documentTypes?.includes(type) ? '#FFFFFF' : '#6C757D',
                                    border: `1px solid ${editingData.documentTypes?.includes(type) ? '#C0392B' : '#DEE2E6'}`,
                                  }}>
                                  {type}
                                </button>
                              ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <button onClick={() => handleEdit(task.id)}
                                className="text-xs px-3 py-1.5 rounded flex items-center gap-1 text-white"
                                style={{ backgroundColor: '#27AE60' }}>
                                <Check size={12} /> Sauvegarder
                              </button>
                              <button onClick={() => { setEditingId(null); setEditingData({}); }}
                                className="text-xs px-3 py-1.5 rounded flex items-center gap-1"
                                style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                                <X size={12} /> Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm break-words" style={{ color: '#2C3E50' }}>{task.taskTitle}</p>
                              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                {task.documentTypes?.length > 0
                                  ? task.documentTypes.map((type: string) => (
                                    <span key={type} className="text-xs px-1.5 py-0.5 rounded"
                                      style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>
                                      {type}
                                    </span>
                                  ))
                                  : <span className="text-xs" style={{ color: '#ADB5BD' }}>Tous les types</span>
                                }
                              </div>
                            </div>
                            {activeView === 'org' && (
                              <div className="flex gap-2 flex-shrink-0 self-end sm:self-auto">
                                <button
                                  onClick={() => { setEditingId(task.id); setEditingData({ taskTitle: task.taskTitle, documentTypes: task.documentTypes || [] }); }}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Pencil size={13} />
                                </button>
                                <button onClick={() => handleDelete(task.id)}
                                  className="p-1.5 rounded transition-colors"
                                  style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}