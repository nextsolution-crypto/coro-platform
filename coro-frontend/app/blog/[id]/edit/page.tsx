'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { ArrowLeft, Save, Eye } from 'lucide-react';

const CATEGORIES = [
  'Réglementation & Normes',
  'Bonnes pratiques terrain',
  'Guides pratiques',
  'Nouvelles CORO',
  'Études de cas',
];

export default function EditBlogPostPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    titleFr: '', titleEn: '', slug: '',
    excerptFr: '', excerptEn: '',
    contentFr: '', contentEn: '',
    category: '', tags: '',
    coverImage: '',
    seoTitleFr: '', seoTitleEn: '',
    seoDescFr: '', seoDescEn: '',
    isPublished: false,
  });

  useEffect(() => { fetchPost(); }, [postId]);

  const fetchPost = async () => {
    try {
      const res = await api.get(`/blog/${postId}`);
      const post = res.data;
      setForm({ ...post, tags: post.tags?.join(', ') || '' });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert('Image max 10MB'); return; }
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/storage/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev: any) => ({ ...prev, coverImage: res.data.url }));
    } catch { alert('Erreur lors du téléversement de l\'image'); }
  };

  const handleSave = async (publish?: boolean) => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      };
      await api.put(`/blog/${postId}`, payload);
      if (publish === true) await api.post(`/blog/${postId}/publish`);
      if (publish === false) await api.post(`/blog/${postId}/unpublish`);
      router.push('/blog');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const inputStyle = {
    border: '1px solid #CED4DA', color: '#2C3E50',
    backgroundColor: '#FFFFFF', width: '100%',
  };

  const charColor = (len: number, max: number) =>
    len > max ? '#C0392B' : len > max * 0.85 ? '#F39C12' : '#ADB5BD';

  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
      {children} {required && <span style={{ color: '#C0392B' }}>*</span>}
    </label>
  );

  const GooglePreview = ({ title, desc, slug }: { title: string; desc: string; slug: string }) => (
    <div className="mt-3 p-3 rounded" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
      <p className="text-xs font-medium mb-1" style={{ color: '#ADB5BD' }}>Aperçu Google</p>
      <p className="text-sm font-medium truncate" style={{ color: '#1A0DAB' }}>
        {title || 'Titre SEO non défini'}
      </p>
      <p className="text-xs truncate" style={{ color: '#006621' }}>
        getcoro.io/blog/{slug || 'slug-article'}
      </p>
      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: '#545454' }}>
        {desc || 'Meta description non définie.'}
      </p>
    </div>
  );

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <button onClick={() => router.push('/blog')}
            className="flex items-center gap-2 text-sm mb-3 transition-colors"
            style={{ color: '#6C757D' }}
            onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
            onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
            <ArrowLeft size={16} /> Retour au blogue
          </button>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Modifier l'article</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {form.isPublished ? (
            <button onClick={() => handleSave(false)} disabled={saving}
              className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded"
              style={{ border: '1px solid #FAD7A0', color: '#F39C12', backgroundColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF9E7'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              Dépublier
            </button>
          ) : (
            <button onClick={() => handleSave(true)} disabled={saving}
              className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded"
              style={{ backgroundColor: '#27AE60' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}>
              <Eye size={15} /> Publier
            </button>
          )}
          <button onClick={() => handleSave()} disabled={saving}
            className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded"
            style={{ backgroundColor: '#C0392B' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
            <Save size={15} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── COLONNE PRINCIPALE (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Titres & Slug */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Titres & URL</h3>
            <div className="space-y-4">
              <div>
                <Label required>Titre (FR)</Label>
                <input type="text" value={form.titleFr}
                  onChange={e => setForm({ ...form, titleFr: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <Label>Titre (EN)</Label>
                <input type="text" value={form.titleEn}
                  onChange={e => setForm({ ...form, titleEn: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <input type="text" value={form.slug}
                  onChange={e => setForm({ ...form, slug: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none font-mono" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>
                  getcoro.io/blog/{form.slug || '...'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Résumés */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Résumés</h3>
            <p className="text-xs mb-4" style={{ color: '#ADB5BD' }}>
              Affiché dans la liste du blogue · 120-160 caractères recommandés
            </p>
            <div className="space-y-4">
              <div>
                <Label>Résumé (FR)</Label>
                <textarea value={form.excerptFr} rows={3}
                  onChange={e => setForm({ ...form, excerptFr: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                <p className="text-xs mt-1" style={{ color: charColor((form.excerptFr || '').length, 160) }}>
                  {(form.excerptFr || '').length}/160
                </p>
              </div>
              <div>
                <Label>Résumé (EN)</Label>
                <textarea value={form.excerptEn} rows={3}
                  onChange={e => setForm({ ...form, excerptEn: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                <p className="text-xs mt-1" style={{ color: charColor((form.excerptEn || '').length, 160) }}>
                  {(form.excerptEn || '').length}/160
                </p>
              </div>
            </div>
          </div>

          {/* 3. SEO */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>🔍 Référencement (SEO)</h3>
            <p className="text-xs mb-5" style={{ color: '#ADB5BD' }}>
              Titre : 50-60 caractères · Description : 150-160 caractères
            </p>

            {/* SEO FR */}
            <div className="mb-6 pb-6" style={{ borderBottom: '1px solid #F1F3F5' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#C0392B' }}>Français</p>
              <div className="space-y-3">
                <div>
                  <Label>Meta titre (FR)</Label>
                  <input type="text" value={form.seoTitleFr || ''}
                    onChange={e => setForm({ ...form, seoTitleFr: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  <p className="text-xs mt-1" style={{ color: charColor((form.seoTitleFr || '').length, 60) }}>
                    {(form.seoTitleFr || '').length}/60
                  </p>
                </div>
                <div>
                  <Label>Meta description (FR)</Label>
                  <textarea value={form.seoDescFr || ''} rows={3}
                    onChange={e => setForm({ ...form, seoDescFr: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  <p className="text-xs mt-1" style={{ color: charColor((form.seoDescFr || '').length, 160) }}>
                    {(form.seoDescFr || '').length}/160
                  </p>
                </div>
                <GooglePreview title={form.seoTitleFr} desc={form.seoDescFr} slug={form.slug} />
              </div>
            </div>

            {/* SEO EN */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#2980B9' }}>English</p>
              <div className="space-y-3">
                <div>
                  <Label>Meta title (EN)</Label>
                  <input type="text" value={form.seoTitleEn || ''}
                    onChange={e => setForm({ ...form, seoTitleEn: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  <p className="text-xs mt-1" style={{ color: charColor((form.seoTitleEn || '').length, 60) }}>
                    {(form.seoTitleEn || '').length}/60
                  </p>
                </div>
                <div>
                  <Label>Meta description (EN)</Label>
                  <textarea value={form.seoDescEn || ''} rows={3}
                    onChange={e => setForm({ ...form, seoDescEn: e.target.value })}
                    className="rounded px-4 py-2.5 text-sm focus:outline-none resize-none" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = '#C0392B'}
                    onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  <p className="text-xs mt-1" style={{ color: charColor((form.seoDescEn || '').length, 160) }}>
                    {(form.seoDescEn || '').length}/160
                  </p>
                </div>
                <GooglePreview title={form.seoTitleEn} desc={form.seoDescEn} slug={form.slug} />
              </div>
            </div>
          </div>

          {/* 4. Contenu FR */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
              Contenu <span style={{ color: '#ADB5BD' }} className="text-xs font-normal">(Français)</span>
            </h3>
            <textarea value={form.contentFr} rows={25}
              onChange={e => setForm({ ...form, contentFr: e.target.value })}
              className="rounded px-4 py-2.5 text-sm focus:outline-none resize-y font-mono"
              style={{ ...inputStyle, lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
          </div>

          {/* 5. Contenu EN */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>
              Content <span style={{ color: '#ADB5BD' }} className="text-xs font-normal">(English)</span>
            </h3>
            <textarea value={form.contentEn} rows={25}
              onChange={e => setForm({ ...form, contentEn: e.target.value })}
              className="rounded px-4 py-2.5 text-sm focus:outline-none resize-y font-mono"
              style={{ ...inputStyle, lineHeight: 1.7 }}
              onFocus={e => e.target.style.borderColor = '#C0392B'}
              onBlur={e => e.target.style.borderColor = '#CED4DA'} />
          </div>
        </div>

        {/* ── COLONNE DROITE (1/3) ── */}
        <div className="space-y-6">

          {/* Image de couverture */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Image de couverture</h3>
            {form.coverImage ? (
              <div className="mb-3 rounded overflow-hidden" style={{ border: '1px solid #DEE2E6' }}>
                <img src={form.coverImage} alt="Couverture" className="w-full h-40 object-cover" />
              </div>
            ) : (
              <div className="mb-3 rounded h-40 flex items-center justify-center"
                style={{ border: '2px dashed #DEE2E6', backgroundColor: '#F8F9FA' }}>
                <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune image</p>
              </div>
            )}
            <label className="flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded cursor-pointer"
              style={{ border: '1px dashed #CED4DA', color: '#6C757D' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {form.coverImage ? 'Changer l\'image' : 'Téléverser une image'}
              <input type="file" accept="image/*" onChange={handleCoverImage} className="hidden" />
            </label>
            {form.coverImage && (
              <button onClick={() => setForm({ ...form, coverImage: '' })}
                className="w-full mt-2 text-xs py-1.5 rounded"
                style={{ color: '#C0392B', border: '1px solid #F1948A' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FDEDEC'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                Supprimer l'image
              </button>
            )}
          </div>

          {/* Classification */}
          <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-4" style={{ color: '#2C3E50' }}>Classification</h3>
            <div className="space-y-4">
              <div>
                <Label>Catégorie</Label>
                <select value={form.category || ''}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'}>
                  <option value="">Sélectionner...</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Tags</Label>
                <input type="text" value={form.tags || ''}
                  onChange={e => setForm({ ...form, tags: e.target.value })}
                  placeholder="PMU, sécurité incendie, Québec"
                  className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#C0392B'}
                  onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>Séparés par des virgules</p>
              </div>
            </div>
          </div>

          {/* Score SEO rapide */}
          <div className="rounded-md p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
            <h3 className="font-semibold mb-3" style={{ color: '#2C3E50' }}>Score SEO</h3>
            {[
              { label: 'Titre SEO FR', ok: (form.seoTitleFr || '').length >= 30 && (form.seoTitleFr || '').length <= 60 },
              { label: 'Description FR', ok: (form.seoDescFr || '').length >= 100 && (form.seoDescFr || '').length <= 160 },
              { label: 'Titre SEO EN', ok: (form.seoTitleEn || '').length >= 30 && (form.seoTitleEn || '').length <= 60 },
              { label: 'Description EN', ok: (form.seoDescEn || '').length >= 100 && (form.seoDescEn || '').length <= 160 },
              { label: 'Slug défini', ok: (form.slug || '').length > 5 },
              { label: 'Image de couverture', ok: !!form.coverImage },
              { label: 'Catégorie', ok: !!form.category },
              { label: 'Tags définis', ok: (form.tags || '').length > 0 },
              { label: 'Résumé FR', ok: (form.excerptFr || '').length >= 80 },
              { label: 'Contenu FR', ok: (form.contentFr || '').length >= 500 },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #F8F9FA' }}>
                <span className="text-xs" style={{ color: '#6C757D' }}>{label}</span>
                <span className="text-xs font-medium" style={{ color: ok ? '#27AE60' : '#E74C3C' }}>
                  {ok ? '✓' : '✗'}
                </span>
              </div>
            ))}
            <div className="mt-3 pt-2">
              {(() => {
                const items = [
                  (form.seoTitleFr || '').length >= 30 && (form.seoTitleFr || '').length <= 60,
                  (form.seoDescFr || '').length >= 100 && (form.seoDescFr || '').length <= 160,
                  (form.seoTitleEn || '').length >= 30 && (form.seoTitleEn || '').length <= 60,
                  (form.seoDescEn || '').length >= 100 && (form.seoDescEn || '').length <= 160,
                  (form.slug || '').length > 5,
                  !!form.coverImage,
                  !!form.category,
                  (form.tags || '').length > 0,
                  (form.excerptFr || '').length >= 80,
                  (form.contentFr || '').length >= 500,
                ];
                const score = Math.round((items.filter(Boolean).length / items.length) * 100);
                const color = score >= 80 ? '#27AE60' : score >= 50 ? '#F39C12' : '#E74C3C';
                return (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color }}>Score global</span>
                    <span className="text-sm font-bold" style={{ color }}>{score}/100</span>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}