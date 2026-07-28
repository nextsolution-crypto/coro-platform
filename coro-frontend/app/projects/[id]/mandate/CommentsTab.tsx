'use client';

import { useState, useEffect } from 'react';
import { Trash2, Pencil, Check, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Props {
  projectId: string;
}

export default function CommentsTab({ projectId }: Props) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => { fetchComments(); }, [projectId]);

  const fetchComments = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/comments`);
      setComments(res.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await api.post(`/projects/${projectId}/comments`, { contenu: newComment.trim() });
      setNewComment('');
      fetchComments();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleEdit = async (commentId: string) => {
    if (!editingText.trim()) return;
    try {
      await api.put(`/projects/${projectId}/comments/${commentId}`, { contenu: editingText.trim() });
      setEditingId(null);
      setEditingText('');
      fetchComments();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Supprimer ce commentaire ?')) return;
    try {
      await api.delete(`/projects/${projectId}/comments/${commentId}`);
      fetchComments();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
    </div>
  );

  return (
    <div className="max-w-3xl">

      {/* Zone de saisie */}
      <div className="rounded-md p-5 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
        <label className="block text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: '#6C757D' }}>
          Nouveau commentaire
        </label>
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          rows={3}
          placeholder="Ajouter une note importante, une information client, un suivi..."
          className="w-full px-3 py-2.5 text-sm rounded resize-vertical focus:outline-none mb-3"
          style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
          onFocus={e => e.target.style.borderColor = '#C0392B'}
          onBlur={e => e.target.style.borderColor = '#CED4DA'}
          onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleAdd(); }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#ADB5BD' }}>Ctrl+Entrée pour envoyer</span>
          <button onClick={handleAdd} disabled={saving || !newComment.trim()}
            className="text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => { if (newComment.trim()) e.currentTarget.style.backgroundColor = '#A93226'; }}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            {saving ? 'Envoi...' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* Liste des commentaires */}
      {comments.length === 0 ? (
        <div className="text-center py-12 rounded-md" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
          <p className="text-2xl mb-3">💬</p>
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun commentaire pour ce projet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => {
            const isOwner = comment.userId === user?.id;
            const isEditing = editingId === comment.id;

            return (
              <div key={comment.id} className="rounded-md p-4"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: '#C0392B' }}>
                      {comment.user?.firstName?.[0]}{comment.user?.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#2C3E50' }}>
                        {comment.user?.firstName} {comment.user?.lastName}
                      </p>
                      <p className="text-xs" style={{ color: '#ADB5BD' }}>
                        {new Date(comment.createdAt).toLocaleDateString('fr-CA', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {isOwner && !isEditing && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button onClick={() => { setEditingId(comment.id); setEditingText(comment.contenu); }}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(comment.id)}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-3">
                  {isEditing ? (
                    <div>
                      <textarea
                        value={editingText}
                        onChange={e => setEditingText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm rounded resize-vertical focus:outline-none mb-2"
                        style={{ border: '1px solid #C0392B', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(comment.id)}
                          className="text-xs px-3 py-1.5 rounded flex items-center gap-1 text-white"
                          style={{ backgroundColor: '#27AE60' }}>
                          <Check size={12} /> Sauvegarder
                        </button>
                        <button onClick={() => { setEditingId(null); setEditingText(''); }}
                          className="text-xs px-3 py-1.5 rounded flex items-center gap-1"
                          style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                          <X size={12} /> Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap" style={{ color: '#495057', lineHeight: '1.6' }}>
                      {comment.contenu}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}