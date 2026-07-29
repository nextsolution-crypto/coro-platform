'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

export default function TimelogCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ key: '', label: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/timelog/catalog');
      setCategories(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newCategory.key.trim() || !newCategory.label.trim()) return;
    setSaving(true);
    try {
      await api.post('/timelog/catalog', newCategory);
      setNewCategory({ key: '', label: '' });
      setShowAddForm(false);
      fetchCategories();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEdit = async (key: string) => {
    if (!editingLabel.trim()) return;
    try {
      await api.put(`/timelog/catalog/${key}`, { label: editingLabel });
      setEditingId(null);
      setEditingLabel('');
      fetchCategories();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (key: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return;
    try {
      await api.delete(`/timelog/catalog/${key}`);
      fetchCategories();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>Paramètres</p>
          <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>Catégories Timelog</h1>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          <Plus size={15} />
          Ajouter une catégorie
        </button>
      </div>

      {/* Formulaire ajout */}
      {showAddForm && (
        <div className="rounded-md p-5 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #AED6F1' }}>
          <h2 className="font-semibold mb-4 text-sm" style={{ color: '#2C3E50' }}>Nouvelle catégorie</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                Clé unique (sans espaces)
              </label>
              <input type="text" value={newCategory.key}
                onChange={e => setNewCategory({ ...newCategory, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                placeholder="ex: reunion_client"
                className="w-full px-3 py-2 text-sm rounded"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#6C757D' }}>
                Libellé affiché
              </label>
              <input type="text" value={newCategory.label}
                onChange={e => setNewCategory({ ...newCategory, label: e.target.value })}
                placeholder="ex: Réunion avec client"
                className="w-full px-3 py-2 text-sm rounded"
                style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
              Annuler
            </button>
            <button onClick={handleAdd} disabled={saving || !newCategory.key || !newCategory.label}
              className="px-4 py-2 rounded text-sm text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: '#C0392B' }}>
              {saving ? 'Sauvegarde...' : 'Ajouter'}
            </button>
          </div>
        </div>
      )}

      {/* Liste catégories */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
        <div className="px-5 py-3" style={{ backgroundColor: '#F8F9FA', borderBottom: '1px solid #E9ECEF' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#ADB5BD' }}>
            {categories.length} catégorie{categories.length > 1 ? 's' : ''}
          </p>
        </div>
        {categories.map((cat, idx) => (
          <div key={cat.key} className="flex items-center justify-between px-5 py-3"
            style={{ borderBottom: idx < categories.length - 1 ? '1px solid #F8F9FA' : 'none' }}>
            {editingId === cat.key ? (
              <div className="flex items-center gap-3 flex-1">
                <input type="text" value={editingLabel}
                  onChange={e => setEditingLabel(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded"
                  style={{ border: '1px solid #C0392B', color: '#2C3E50' }}
                  autoFocus />
                <button onClick={() => handleEdit(cat.key)}
                  className="p-1.5 rounded text-white"
                  style={{ backgroundColor: '#27AE60' }}>
                  <Check size={13} />
                </button>
                <button onClick={() => { setEditingId(null); setEditingLabel(''); }}
                  className="p-1.5 rounded"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm" style={{ color: '#2C3E50' }}>{cat.label}</p>
                  <p className="text-xs" style={{ color: '#ADB5BD' }}>{cat.key}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingId(cat.key); setEditingLabel(cat.label); }}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDelete(cat.key)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </AppLayout>
  );
}