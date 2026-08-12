'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../../store/auth';
import PortalLayout from '../../components/PortalLayout';
import { Download, CheckCircle, MessageSquare, ArrowLeft, Clock, Eye } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; label: string }> = {
  DRAFT:       { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6', label: 'Brouillon' },
  IN_PROGRESS: { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1', label: 'En cours' },
  REVIEW:      { bg: '#FEF9E7', text: '#F39C12', border: '#FAD7A0', label: 'En révision' },
  VALIDATED:   { bg: '#EAFAF1', text: '#27AE60', border: '#A9DFBF', label: 'Validé' },
  ARCHIVED:    { bg: '#FDEDEC', text: '#C0392B', border: '#F1948A', label: 'Archivé' },
};

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const user = getUser();

  const [project, setProject] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [signName, setSignName] = useState('');
  const [signComment, setSignComment] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    setSignName(`${user.firstName} ${user.lastName}`);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectRes, commentsRes] = await Promise.all([
        apiGet(`/client-portal/projects/${projectId}`),
        apiGet(`/client-portal/projects/${projectId}/comments`),
      ]);
      setProject(projectRes);
      setComments(commentsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signName.trim()) return;
    setSigning(true);
    try {
      await apiPost(`/client-portal/projects/${projectId}/sign`, {
        fullName: signName,
        comment: signComment,
      });
      await fetchData();
      setShowSignModal(false);
      setSignComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSigning(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setAddingComment(true);
    try {
      await apiPost(`/client-portal/projects/${projectId}/comments`, { contenu: newComment });
      setNewComment('');
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingComment(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('coro_client_token');
      const res = await fetch(`${API_URL}/projects/${projectId}/export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedModules: [1, 2, 3, 4, 5, 6, 7, 8],
          moduleOrder: [1, 2, 3, 4, 5, 6, 7, 8],
          language: 'fr',
          isPreview: false,
        }),
      });
      if (!res.ok) throw new Error('Erreur téléchargement');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'document'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléchargement.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return (
    <PortalLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Chargement...</p>
      </div>
    </PortalLayout>
  );

  if (!project) return (
    <PortalLayout>
      <p style={{ color: '#ADB5BD' }}>Document introuvable.</p>
    </PortalLayout>
  );

  const sc = STATUS_COLORS[project.status] || STATUS_COLORS.DRAFT;
  const mySignature = project.signatures?.find((s: any) => s.clientUser?.email === user?.email);
  const isValidated = project.status === 'VALIDATED';

  return (
    <PortalLayout>
      {/* Retour */}
      <button
        onClick={() => router.push('/documents')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24,
          background: 'none', border: 'none', cursor: 'pointer', color: '#6C757D', fontSize: 14,
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#2C3E50'}
        onMouseLeave={e => e.currentTarget.style.color = '#6C757D'}>
        <ArrowLeft size={16} /> Retour aux documents
      </button>

      {/* En-tête */}
      <div style={{
        backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF',
        padding: '24px 28px', marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 800, color: '#FFFFFF',
                backgroundColor: '#2980B9', padding: '3px 10px', borderRadius: 4,
              }}>
                {project.documentType}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
                backgroundColor: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
              }}>
                {sc.label}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2C3E50', marginBottom: 6 }}>
              {project.name}
            </h1>
            <p style={{ fontSize: 14, color: '#6C757D' }}>
              {project.building?.name} · {project.building?.address} · {project.year}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {isValidated && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none',
                  cursor: downloading ? 'not-allowed' : 'pointer', opacity: downloading ? 0.7 : 1,
                }}>
                <Download size={16} />
                {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
              </button>
            )}
            {isValidated && !mySignature && (
              <button
                onClick={() => setShowSignModal(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 18px', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  backgroundColor: '#FFFFFF', color: '#8E44AD',
                  border: '2px solid #8E44AD', cursor: 'pointer',
                }}>
                <CheckCircle size={16} />
                Signer le document
              </button>
            )}
          </div>
        </div>

        {/* Infos approbation */}
        {isValidated && project.approvedBy && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <CheckCircle size={16} color="#27AE60" />
            <p style={{ fontSize: 13, color: '#27AE60' }}>
              Approuvé par <strong>{project.approvedBy.firstName} {project.approvedBy.lastName}</strong>
              {project.approvedAt && ` le ${new Date(project.approvedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            </p>
          </div>
        )}

        {project.status === 'REVIEW' && (
          <div style={{
            marginTop: 16, padding: '12px 16px', borderRadius: 8,
            backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Clock size={16} color="#F39C12" />
            <p style={{ fontSize: 13, color: '#F39C12' }}>
              Ce document est en cours de révision par votre conseiller.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', gap: 24 }}>

        {/* Signatures */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E9ECEF' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
              Signatures ({project.signatures?.length || 0})
            </h2>
          </div>
          <div style={{ padding: 24 }}>
            {mySignature && (
              <div style={{
                backgroundColor: '#F4ECF7', border: '1px solid #D2B4DE',
                borderRadius: 8, padding: '12px 16px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <CheckCircle size={16} color="#8E44AD" />
                <p style={{ fontSize: 13, color: '#8E44AD', fontWeight: 600 }}>
                  Vous avez signé ce document
                </p>
              </div>
            )}
            {!project.signatures || project.signatures.length === 0 ? (
              <p style={{ fontSize: 14, color: '#ADB5BD', textAlign: 'center', padding: '16px 0' }}>
                Aucune signature pour l'instant.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {project.signatures.map((sig: any) => (
                  <div key={sig.id} style={{
                    padding: '12px 16px', borderRadius: 8,
                    backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <CheckCircle size={14} color="#8E44AD" />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{sig.fullName}</p>
                    </div>
                    <p style={{ fontSize: 12, color: '#6C757D' }}>{sig.email}</p>
                    <p style={{ fontSize: 12, color: '#ADB5BD', marginTop: 4 }}>
                      {new Date(sig.signedAt).toLocaleDateString('fr-CA', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {sig.comment && (
                      <p style={{ fontSize: 13, color: '#6C757D', marginTop: 8, fontStyle: 'italic' }}>
                        "{sig.comment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Commentaires */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E9ECEF' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2C3E50' }}>
              Commentaires ({comments.length})
            </h2>
          </div>
          <div style={{ padding: 24 }}>
            {/* Ajouter commentaire */}
            <div style={{ marginBottom: 20 }}>
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  border: '1px solid #DEE2E6', fontSize: 14, color: '#2C3E50',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#C0392B'}
                onBlur={e => e.target.style.borderColor = '#DEE2E6'}
              />
              <button
                onClick={handleAddComment}
                disabled={addingComment || !newComment.trim()}
                style={{
                  marginTop: 8, padding: '8px 16px', borderRadius: 6,
                  backgroundColor: '#C0392B', color: '#FFFFFF', border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: addingComment || !newComment.trim() ? 0.5 : 1,
                }}>
                <MessageSquare size={14} style={{ display: 'inline', marginRight: 6 }} />
                Envoyer
              </button>
            </div>

            {/* Liste commentaires */}
            {comments.length === 0 ? (
              <p style={{ fontSize: 14, color: '#ADB5BD', textAlign: 'center', padding: '16px 0' }}>
                Aucun commentaire.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {comments.map((c: any) => (
                  <div key={c.id} style={{
                    padding: '12px 16px', borderRadius: 8,
                    backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>
                        {c.user?.firstName} {c.user?.lastName}
                        {c.user?.role && c.user.role !== 'CLIENT_MANAGER' && c.user.role !== 'CLIENT_CORPORATE' && (
                          <span style={{ fontSize: 11, color: '#ADB5BD', marginLeft: 6 }}>· Conseiller</span>
                        )}
                      </p>
                      <p style={{ fontSize: 11, color: '#ADB5BD' }}>
                        {new Date(c.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <p style={{ fontSize: 14, color: '#495057', lineHeight: 1.6 }}>{c.contenu}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal signature */}
      {showSignModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24,
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40,
            width: '100%', maxWidth: 480, boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#2C3E50', marginBottom: 8 }}>
              ✍️ Signer le document
            </h3>
            <p style={{ fontSize: 14, color: '#6C757D', marginBottom: 24 }}>
              En signant, vous confirmez avoir pris connaissance de ce document de conformité.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
                Nom complet *
              </label>
              <input
                type="text" value={signName}
                onChange={e => setSignName(e.target.value)}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 6,
                  border: '1px solid #DEE2E6', fontSize: 15, color: '#2C3E50',
                  outline: 'none', boxSizing: 'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#8E44AD'}
                onBlur={e => e.target.style.borderColor = '#DEE2E6'}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
                Commentaire (optionnel)
              </label>
              <textarea
                value={signComment}
                onChange={e => setSignComment(e.target.value)}
                placeholder="Ex: Document conforme à nos installations."
                rows={3}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 6,
                  border: '1px solid #DEE2E6', fontSize: 14, color: '#2C3E50',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{
              backgroundColor: '#F4ECF7', border: '1px solid #D2B4DE',
              borderRadius: 8, padding: '12px 16px', marginBottom: 24,
            }}>
              <p style={{ fontSize: 13, color: '#8E44AD' }}>
                🔒 Cette signature sera enregistrée avec votre nom, courriel ({user?.email}) et la date/heure actuelle.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowSignModal(false)}
                style={{
                  flex: 1, padding: '12px', borderRadius: 6,
                  border: '1px solid #DEE2E6', backgroundColor: 'transparent',
                  color: '#6C757D', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                Annuler
              </button>
              <button
                onClick={handleSign}
                disabled={signing || !signName.trim()}
                style={{
                  flex: 1, padding: '12px', borderRadius: 6,
                  backgroundColor: signing || !signName.trim() ? '#ADB5BD' : '#8E44AD',
                  color: '#FFFFFF', border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: signing || !signName.trim() ? 'not-allowed' : 'pointer',
                }}>
                {signing ? 'Signature...' : '✓ Signer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}