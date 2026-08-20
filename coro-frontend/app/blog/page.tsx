'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Plus, Eye, EyeOff, Edit2, Trash2, Globe } from 'lucide-react';

const CATEGORIES = [
  'Réglementation & Normes',
  'Bonnes pratiques terrain',
  'Guides pratiques',
  'Nouvelles CORO',
  'Études de cas',
];

export default function BlogAdminPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchPosts();
  }, [isAuthenticated]);

  const fetchPosts = async () => {
    try {
      const res = await api.get('/blog');
      setPosts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePublish = async (id: string, isPublished: boolean) => {
    try {
      await api.post(`/blog/${id}/${isPublished ? 'unpublish' : 'publish'}`);
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Supprimer l'article "${title}" ?`)) return;
    try {
      await api.delete(`/blog/${id}`);
      fetchPosts();
    } catch (err) { console.error(err); }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Blogue</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {posts.filter((p: any) => p.isPublished).length} publié(s) · {posts.filter((p: any) => p.scheduledAt && !p.isPublished).length} programmé(s) · {posts.filter((p: any) => !p.isPublished && !p.scheduledAt).length} brouillon(s)
          </p>
        </div>
        <button
          onClick={() => router.push('/blog/new')}
          className="w-full sm:w-auto flex items-center justify-center gap-2 text-white text-sm font-medium px-4 py-2 rounded"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          <Plus size={16} />
          Nouvel article
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-md p-12 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <p className="text-4xl mb-4">✍️</p>
          <p className="font-semibold mb-2" style={{ color: '#2C3E50' }}>Aucun article pour l'instant</p>
          <p className="text-sm mb-6" style={{ color: '#ADB5BD' }}>
            Créez votre premier article de blogue pour améliorer votre référencement.
          </p>
          <button
            onClick={() => router.push('/blog/new')}
            className="text-white text-sm font-medium px-6 py-2.5 rounded"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            + Créer le premier article
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <div key={post.id}
              className="rounded-md p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

              {/* Image couverture */}
              {post.coverImage && (
                <div className="w-full sm:w-20 h-20 rounded overflow-hidden flex-shrink-0">
                  <img src={post.coverImage} alt={post.titleFr}
                    className="w-full h-full object-cover" />
                </div>
              )}

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {post.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#EBF5FB', color: '#2980B9', border: '1px solid #AED6F1' }}>
                      {post.category}
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: post.isPublished ? '#EAFAF1' : post.scheduledAt ? '#EBF5FB' : '#F8F9FA',
                      color: post.isPublished ? '#27AE60' : post.scheduledAt ? '#2980B9' : '#6C757D',
                      border: `1px solid ${post.isPublished ? '#A9DFBF' : post.scheduledAt ? '#AED6F1' : '#DEE2E6'}`,
                    }}>
                    {post.isPublished ? '✓ Publié' : post.scheduledAt ? `📅 ${new Date(post.scheduledAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Brouillon'}
                  </span>
                </div>
                <p className="font-semibold truncate" style={{ color: '#2C3E50' }}>{post.titleFr}</p>
                <p className="text-xs mt-1 truncate" style={{ color: '#ADB5BD' }}>{post.titleEn}</p>
                <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                  {post.isPublished && post.publishedAt
                    ? `Publié le ${new Date(post.publishedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}`
                    : post.scheduledAt
                    ? `Programmé pour le ${new Date(post.scheduledAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                    : `Créé le ${new Date(post.createdAt).toLocaleDateString('fr-CA')}`}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {post.isPublished && (
                  <a href={`https://getcoro.io/blog/${post.slug}`} target="_blank" rel="noreferrer"
                    className="p-2 rounded transition-colors"
                    style={{ color: '#2980B9', border: '1px solid #AED6F1' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    title="Voir sur la vitrine">
                    <Globe size={15} />
                  </a>
                )}
                <button
                  onClick={() => handlePublish(post.id, post.isPublished)}
                  className="p-2 rounded transition-colors"
                  style={{
                    color: post.isPublished ? '#F39C12' : '#27AE60',
                    border: `1px solid ${post.isPublished ? '#FAD7A0' : '#A9DFBF'}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = post.isPublished ? '#FEF9E7' : '#EAFAF1'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title={post.isPublished ? 'Dépublier' : 'Publier'}>
                  {post.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  onClick={() => router.push(`/blog/${post.id}/edit`)}
                  className="p-2 rounded transition-colors"
                  style={{ color: '#6C757D', border: '1px solid #DEE2E6' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title="Modifier">
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => handleDelete(post.id, post.titleFr)}
                  className="p-2 rounded transition-colors"
                  style={{ color: '#ADB5BD', border: '1px solid #DEE2E6' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FDEDEC'; e.currentTarget.style.color = '#C0392B'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#ADB5BD'; }}
                  title="Supprimer">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}