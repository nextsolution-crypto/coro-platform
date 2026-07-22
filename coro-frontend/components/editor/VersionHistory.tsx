'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { History, RotateCcw, Trash2, Plus, X } from 'lucide-react';

interface Version {
  id: string;
  versionNumber: number;
  label: string;
  createdAt: string;
}

interface VersionHistoryProps {
  projectId: string;
  onRestore?: () => void;
  onClose: () => void;
}

export default function VersionHistory({ projectId, onRestore, onClose }: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);

  useEffect(() => { fetchVersions(); }, []);

  const fetchVersions = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/versions`);
      setVersions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/versions`, { label: label || undefined });
      setLabel('');
      setShowLabelInput(false);
      await fetchVersions();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleRestore = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Restaurer la version ${versionNumber} ? La version actuelle sera sauvegardée automatiquement avant la restauration.`)) return;
    setRestoring(versionId);
    try {
      await api.post(`/projects/${projectId}/versions/${versionId}/restore`);
      await fetchVersions();
      onRestore?.();
    } catch (err) { console.error(err); }
    finally { setRestoring(null); }
  };

  const handleDelete = async (versionId: string) => {
    if (!confirm('Supprimer cette version ? Cette action est irréversible.')) return;
    try {
      await api.delete(`/projects/${projectId}/versions/${versionId}`);
      setVersions(prev => prev.filter(v => v.id !== versionId));
    } catch (err) { console.error(err); }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 flex items-center justify-end z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="h-full w-full max-w-md flex flex-col"
        style={{ backgroundColor: '#FFFFFF', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #E9ECEF' }}>
          <div className="flex items-center gap-2">
            <History size={18} style={{ color: '#C0392B' }} />
            <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Historique des versions</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
            <X size={18} />
          </button>
        </div>

        {/* Bouton sauvegarder */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
          {showLabelInput ? (
            <div className="space-y-2">
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="Nom de la version (optionnel)"
                autoFocus
                className="w-full text-sm rounded px-3 py-2 focus:outline-none"
                style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowLabelInput(false); }}
              />
              <div className="flex gap-2">
                <button onClick={() => setShowLabelInput(false)}
                  className="flex-1 text-sm py-2 rounded transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 text-sm py-2 rounded text-white font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#C0392B' }}>
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowLabelInput(true)}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded transition-colors"
              style={{ border: '1px solid #C0392B', color: '#C0392B' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              <Plus size={14} />
              Sauvegarder la version actuelle
            </button>
          )}
        </div>

        {/* Liste des versions */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-center animate-pulse" style={{ color: '#ADB5BD' }}>
              Chargement...
            </p>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <History size={28} className="mx-auto mb-3" style={{ color: '#DEE2E6' }} />
              <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune version sauvegardée</p>
              <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                Cliquez sur "Sauvegarder" pour créer un point de restauration.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((v, idx) => (
                <div key={v.id}
                  className="rounded-md p-4 group"
                  style={{
                    border: `1px solid ${idx === 0 ? '#A9DFBF' : '#E9ECEF'}`,
                    backgroundColor: idx === 0 ? '#EAFAF1' : '#FFFFFF',
                  }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: idx === 0 ? '#27AE60' : '#F8F9FA',
                            color: idx === 0 ? '#FFFFFF' : '#6C757D',
                          }}>
                          v{v.versionNumber}
                        </span>
                        {idx === 0 && (
                          <span className="text-xs font-medium" style={{ color: '#27AE60' }}>
                            Dernière version
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-1" style={{ color: '#2C3E50' }}>
                        {v.label}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
                        {formatDate(v.createdAt)}
                      </p>
                    </div>

                    {idx > 0 && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRestore(v.id, v.versionNumber)}
                          disabled={restoring === v.id}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors disabled:opacity-50"
                          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#F39C12'; e.currentTarget.style.color = '#F39C12'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#DEE2E6'; e.currentTarget.style.color = '#6C757D'; }}
                          title="Restaurer cette version"
                        >
                          <RotateCcw size={11} />
                          {restoring === v.id ? '...' : 'Restaurer'}
                        </button>
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="p-1 rounded transition-colors"
                          style={{ color: '#ADB5BD' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                          onMouseLeave={e => e.currentTarget.style.color = '#ADB5BD'}
                          title="Supprimer cette version"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
