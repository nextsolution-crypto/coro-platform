'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../../store/auth';
import PortalLayout from '../../components/PortalLayout';
import {
  Download,
  CheckCircle,
  MessageSquare,
  ArrowLeft,
  Clock,
} from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const STATUS_COLORS: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    label: string;
  }
> = {
  DRAFT: {
    bg: '#F8F9FA',
    text: '#6C757D',
    border: '#DEE2E6',
    label: 'Brouillon',
  },

  IN_PROGRESS: {
    bg: '#EBF5FB',
    text: '#2980B9',
    border: '#AED6F1',
    label: 'En cours',
  },

  REVIEW: {
    bg: '#FEF9E7',
    text: '#F39C12',
    border: '#FAD7A0',
    label: 'En révision',
  },

  VALIDATED: {
    bg: '#EAFAF1',
    text: '#27AE60',
    border: '#A9DFBF',
    label: 'Validé',
  },

  ARCHIVED: {
    bg: '#FDEDEC',
    text: '#C0392B',
    border: '#F1948A',
    label: 'Archivé',
  },
};

export default function DocumentDetailPage() {
  const router = useRouter();
  const params = useParams();

  const projectId = params?.id as string;

  const [user, setUser] = useState<any>(null);
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
  const [showRefuseModal, setShowRefuseModal] = useState(false);
  const [refuseComment, setRefuseComment] = useState('');
  const [refusing, setRefusing] = useState(false);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    setSignName(
      `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim()
    );

    fetchData();
    trackOpen();
  }, [router, projectId]);

  const trackOpen = async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
      const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
      await apiPost(`/client-portal/projects/${projectId}/engagement`, { event: 'opened', device });
    } catch (err) { /* silencieux */ }
  };

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
    if (!signName.trim()) {
      return;
    }

    setSigning(true);

    try {
      await apiPost(
        `/client-portal/projects/${projectId}/sign`,
        {
          fullName: signName,
          comment: signComment,
        }
      );

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
    if (!newComment.trim()) {
      return;
    }

    setAddingComment(true);

    try {
      await apiPost(
        `/client-portal/projects/${projectId}/comments`,
        {
          contenu: newComment,
        }
      );

      setNewComment('');

      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingComment(false);
    }
  };

const handleRefuse = async () => {
    if (!refuseComment.trim()) return;
    setRefusing(true);
    try {
      await apiPost(`/client-portal/projects/${projectId}/refuse`, {
        comment: refuseComment,
      });
      setShowRefuseModal(false);
      setRefuseComment('');
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Erreur lors du refus.');
    } finally {
      setRefusing(false);
    }
  };

  const handleDownload = async (lang: 'fr' | 'en' = 'fr') => {
    setDownloading(true);

    try {
      // Utiliser le PDF officiel (sans filigrane) si disponible après signature
      const pdfUrl = lang === 'fr'
        ? (project?.officialPdfFr || project?.exportedPdfFr)
        : (project?.officialPdfEn || project?.exportedPdfEn);

      if (pdfUrl) {
        const anchor = document.createElement('a');
        anchor.href = pdfUrl;
        anchor.download = `${project?.name || 'document'}-${lang.toUpperCase()}.pdf`;
        anchor.target = '_blank';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } else {
        alert('Le PDF n\'est pas encore disponible. Veuillez contacter votre conseiller.');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors du téléchargement.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading || !user) {
    return (
      <PortalLayout>
        <div
          style={{
            minHeight: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <p
            className="animate-pulse"
            style={{
              margin: 0,
              color: '#ADB5BD',
              fontSize: 14,
            }}
          >
            Chargement...
          </p>
        </div>
      </PortalLayout>
    );
  }

  if (!project) {
    return (
      <PortalLayout>
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
            borderRadius: 12,
            padding: 'clamp(20px, 6vw, 32px)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#ADB5BD',
              fontSize: 14,
            }}
          >
            Document introuvable.
          </p>
        </div>
      </PortalLayout>
    );
  }

  const sc =
    STATUS_COLORS[project.status] ||
    STATUS_COLORS.DRAFT;

  const mySignature = project.signatures?.find(
    (signature: any) =>
      signature.clientUser?.email === user.email
  );

  const isValidated =
    project.status === 'VALIDATED';

  return (
    <PortalLayout>
      {/* Retour */}
      <button
        type="button"
        onClick={() => router.push('/documents')}
        style={{
          minHeight: 40,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          marginBottom: 20,
          padding: '6px 4px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6C757D',
          fontSize: 14,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#2C3E50';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#6C757D';
        }}
      >
        <ArrowLeft size={17} />
        Retour aux documents
      </button>

      {/* En-tête document */}
      <section
        style={{
          minWidth: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #E9ECEF',
          padding: 'clamp(18px, 4vw, 28px)',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          {/* Informations */}
          <div
            style={{
              flex: '1 1 320px',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  backgroundColor: '#2980B9',
                  padding: '4px 10px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                }}
              >
                {project.documentType}
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 10,
                  backgroundColor: sc.bg,
                  color: sc.text,
                  border: `1px solid ${sc.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {sc.label}
              </span>
            </div>

            <h1
              style={{
                margin: '0 0 8px',
                fontSize: 'clamp(20px, 5vw, 24px)',
                lineHeight: 1.3,
                fontWeight: 800,
                color: '#2C3E50',
                overflowWrap: 'anywhere',
              }}
            >
              {project.name}
            </h1>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px 8px',
                fontSize: 14,
                color: '#6C757D',
                lineHeight: 1.5,
              }}
            >
              {project.building?.name && (
                <span>
                  {project.building.name}
                </span>
              )}

              {project.building?.address && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      color: '#CED4DA',
                    }}
                  >
                    ·
                  </span>

                  <span>
                    {project.building.address}
                  </span>
                </>
              )}

              {project.year && (
                <>
                  <span
                    aria-hidden="true"
                    style={{
                      color: '#CED4DA',
                    }}
                  >
                    ·
                  </span>

                  <span>
                    {project.year}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          {isValidated && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
                gap: 10,
                width: '100%',
                maxWidth: 620,
                flex: '1 1 360px',
                minWidth: 0,
              }}
            >
              {project?.exportedPdfFr && !mySignature && (
                <button
                  type="button"
                  onClick={() => window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(project.exportedPdfFr)}&embedded=false`, '_blank')}
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#2980B9',
                    border: '2px solid #2980B9',
                    cursor: 'pointer',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  👁 Visualiser (FR)
                </button>
              )}

              {(project?.officialPdfFr || (project?.exportedPdfFr && mySignature)) && (
                <button
                  type="button"
                  onClick={() => handleDownload('fr')}
                  disabled={downloading}
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: '#C0392B',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    opacity: downloading ? 0.7 : 1,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <Download size={16} />
                  {downloading ? 'Téléchargement...' : 'Télécharger PDF (FR)'}
                </button>
              )}

              {project?.exportedPdfEn && (
                <button
                  type="button"
                  onClick={() => handleDownload('en')}
                  disabled={downloading}
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: '#2980B9',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    opacity: downloading ? 0.7 : 1,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <Download size={16} />
                  {downloading ? 'Downloading...' : 'Download PDF (EN)'}
                </button>
              )}

              {!project?.exportedPdfFr && !project?.exportedPdfEn && (
                <button
                  type="button"
                  onClick={() => handleDownload('fr')}
                  disabled={downloading}
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: '#C0392B',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: downloading ? 'not-allowed' : 'pointer',
                    opacity: downloading ? 0.7 : 1,
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <Download size={16} />
                  {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
                </button>
              )}

              {!mySignature && (
                <button
                  type="button"
                  onClick={() => setShowRefuseModal(true)}
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#C0392B',
                    border: '2px solid #C0392B',
                    cursor: 'pointer',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  ✕ Refuser et commenter
                </button>
              )}

              {!mySignature && (
                <button
                  type="button"
                  onClick={() =>
                    setShowSignModal(true)
                  }
                  style={{
                    minHeight: 46,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 7,
                    padding: '10px 16px',
                    borderRadius: 7,
                    fontSize: 14,
                    fontWeight: 600,
                    backgroundColor: '#FFFFFF',
                    color: '#8E44AD',
                    border: '2px solid #8E44AD',
                    cursor: 'pointer',
                    width: '100%',
                    minWidth: 0,
                  }}
                >
                  <CheckCircle size={16} />
                  Signer le document
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Checklist de complétion ── */}
        {isValidated && (
          <div
            style={{
              marginTop: 20,
              padding: 'clamp(14px, 4vw, 20px)',
              borderRadius: 10,
              backgroundColor: '#F8F9FA',
              border: '1px solid #E9ECEF',
            }}
          >
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 12,
                fontWeight: 700,
                color: '#ADB5BD',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Progression
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(145px, 100%), 1fr))',
                gap: 10,
              }}
            >
              {[
                { label: 'Document reçu', done: true, color: '#27AE60' },
                { label: 'Document consulté', done: true, color: '#27AE60' },
                {
                  label: 'Document signé',
                  done: !!mySignature,
                  color: mySignature ? '#8E44AD' : '#ADB5BD',
                },
              ].map((step) => (
                <div
                  key={step.label}
                  style={{
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${
                      step.done ? `${step.color}55` : '#E9ECEF'
                    }`,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      flexShrink: 0,
                      backgroundColor: step.done ? step.color : '#E9ECEF',
                      color: step.done ? '#FFFFFF' : '#ADB5BD',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 800,
                      transition: 'all 0.3s',
                    }}
                  >
                    {step.done ? '✓' : '○'}
                  </div>

                  <span
                    style={{
                      minWidth: 0,
                      fontSize: 12,
                      lineHeight: 1.35,
                      fontWeight: 600,
                      color: step.done ? step.color : '#ADB5BD',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {!mySignature && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#ADB5BD',
                  textAlign: 'center',
                }}
              >
                Veuillez lire le document et cliquer sur &quot;Signer le document&quot; pour compléter le processus.
              </p>
            )}

            {mySignature && (
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: '#8E44AD',
                  textAlign: 'center',
                  fontWeight: 600,
                }}
              >
                ✓ Processus complété — Signé le{' '}
                {new Date(mySignature.signedAt).toLocaleDateString('fr-CA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        )}

        {/* Approbation */}
        {isValidated && project.approvedBy && (
          <div
            style={{
              marginTop: 18,
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: '#EAFAF1',
              border: '1px solid #A9DFBF',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <CheckCircle
              size={17}
              color="#27AE60"
              style={{
                marginTop: 1,
                flexShrink: 0,
              }}
            />

            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: '#27AE60',
              }}
            >
              Approuvé par{' '}
              <strong>
                {project.approvedBy.firstName}{' '}
                {project.approvedBy.lastName}
              </strong>

              {project.approvedAt &&
                ` le ${new Date(
                  project.approvedAt
                ).toLocaleDateString('fr-CA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}`}
            </p>
          </div>
        )}

        {/* Révision */}
        {project.status === 'REVIEW' && (
          <div
            style={{
              marginTop: 18,
              padding: '12px 14px',
              borderRadius: 8,
              backgroundColor: '#FEF9E7',
              border: '1px solid #FAD7A0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Clock
              size={17}
              color="#F39C12"
              style={{
                marginTop: 1,
                flexShrink: 0,
              }}
            />

            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.5,
                color: '#F39C12',
              }}
            >
              Ce document est en cours de
              révision par votre conseiller.
            </p>
          </div>
        )}
      </section>

      {/* Deux colonnes */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(360px, 100%), 1fr))',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Signatures */}
        <section
          style={{
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px clamp(16px, 4vw, 24px)',
              borderBottom: '1px solid #E9ECEF',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#2C3E50',
              }}
            >
              Signatures (
              {project.signatures?.length || 0})
            </h2>
          </div>

          <div
            style={{
              padding: 'clamp(16px, 4vw, 24px)',
            }}
          >
            {mySignature && (
              <div
                style={{
                  backgroundColor: '#F4ECF7',
                  border: '1px solid #D2B4DE',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <CheckCircle
                  size={16}
                  color="#8E44AD"
                  style={{
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />

                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#8E44AD',
                    fontWeight: 600,
                  }}
                >
                  Vous avez signé ce document
                </p>
              </div>
            )}

            {!project.signatures ||
            project.signatures.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#ADB5BD',
                  textAlign: 'center',
                  padding: '16px 0',
                }}
              >
                Aucune signature pour
                l&apos;instant.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {project.signatures.map(
                  (sig: any) => (
                    <article
                      key={sig.id}
                      style={{
                        minWidth: 0,
                        padding: '12px 14px',
                        borderRadius: 8,
                        backgroundColor: '#F8F9FA',
                        border:
                          '1px solid #E9ECEF',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems:
                            'flex-start',
                          gap: 8,
                          marginBottom: 4,
                        }}
                      >
                        <CheckCircle
                          size={14}
                          color="#8E44AD"
                          style={{
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        />

                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            lineHeight: 1.4,
                            fontWeight: 700,
                            color: '#2C3E50',
                            overflowWrap:
                              'anywhere',
                          }}
                        >
                          {sig.fullName}
                        </p>
                      </div>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: '#6C757D',
                          overflowWrap:
                            'anywhere',
                        }}
                      >
                        {sig.email}
                      </p>

                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 12,
                          color: '#ADB5BD',
                        }}
                      >
                        {new Date(
                          sig.signedAt
                        ).toLocaleDateString(
                          'fr-CA',
                          {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </p>

                      {sig.comment && (
                        <p
                          style={{
                            margin: '8px 0 0',
                            fontSize: 13,
                            lineHeight: 1.5,
                            color: '#6C757D',
                            fontStyle: 'italic',
                            overflowWrap:
                              'anywhere',
                          }}
                        >
                          « {sig.comment} »
                        </p>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </section>

        {/* Commentaires */}
        <section
          style={{
            minWidth: 0,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #E9ECEF',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px clamp(16px, 4vw, 24px)',
              borderBottom: '1px solid #E9ECEF',
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                color: '#2C3E50',
              }}
            >
              Commentaires ({comments.length})
            </h2>
          </div>

          <div
            style={{
              padding: 'clamp(16px, 4vw, 24px)',
            }}
          >
            {/* Nouveau commentaire */}
            <div
              style={{
                marginBottom: 20,
              }}
            >
              <textarea
                value={newComment}
                onChange={(e) =>
                  setNewComment(e.target.value)
                }
                placeholder="Ajouter un commentaire..."
                rows={3}
                style={{
                  width: '100%',
                  minHeight: 96,
                  padding: '12px 14px',
                  borderRadius: 7,
                  border: '1px solid #DEE2E6',
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: '#2C3E50',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    '#C0392B';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    '#DEE2E6';
                }}
              />

              <button
                type="button"
                onClick={handleAddComment}
                disabled={
                  addingComment ||
                  !newComment.trim()
                }
                style={{
                  minHeight: 44,
                  marginTop: 8,
                  padding: '9px 16px',
                  borderRadius: 7,
                  backgroundColor: '#C0392B',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor:
                    addingComment ||
                    !newComment.trim()
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    addingComment ||
                    !newComment.trim()
                      ? 0.5
                      : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  width: 'min(100%, 180px)',
                }}
              >
                <MessageSquare size={14} />

                {addingComment
                  ? 'Envoi...'
                  : 'Envoyer'}
              </button>
            </div>

            {/* Liste */}
            {comments.length === 0 ? (
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#ADB5BD',
                  textAlign: 'center',
                  padding: '16px 0',
                }}
              >
                Aucun commentaire.
              </p>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {comments.map((c: any) => (
                  <article
                    key={c.id}
                    style={{
                      minWidth: 0,
                      padding: '12px 14px',
                      borderRadius: 8,
                      backgroundColor: '#F8F9FA',
                      border:
                        '1px solid #E9ECEF',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          minWidth: 0,
                          fontSize: 13,
                          lineHeight: 1.4,
                          fontWeight: 600,
                          color: '#2C3E50',
                          overflowWrap:
                            'anywhere',
                        }}
                      >
                        {c.user?.firstName}{' '}
                        {c.user?.lastName}

                        {c.user?.role &&
                          c.user.role !==
                            'CLIENT_MANAGER' &&
                          c.user.role !==
                            'CLIENT_CORPORATE' && (
                            <span
                              style={{
                                fontSize: 11,
                                color:
                                  '#ADB5BD',
                                marginLeft: 6,
                                whiteSpace:
                                  'nowrap',
                              }}
                            >
                              · Conseiller
                            </span>
                          )}
                      </p>

                      <p
                        style={{
                          margin: 0,
                          fontSize: 11,
                          color: '#ADB5BD',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {new Date(
                          c.createdAt
                        ).toLocaleDateString(
                          'fr-CA',
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                      </p>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: '#495057',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {c.contenu}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

{showRefuseModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => !refusing && setShowRefuseModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: 'calc(100dvh - 32px)',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 'clamp(20px, 6vw, 40px)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              margin: 'auto 0',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#C0392B' }}>
              ✕ Refuser le document
            </h3>
            <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: '#6C757D' }}>
              Décrivez les modifications requises. Votre conseiller recevra une notification et pourra apporter les corrections nécessaires.
            </p>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 6 }}>
                Commentaire *
              </label>
              <textarea
                value={refuseComment}
                onChange={(e) => setRefuseComment(e.target.value)}
                placeholder="Ex: La section 3.2 ne correspond pas à notre configuration actuelle. Le responsable incendie indiqué a changé."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 7,
                  border: '1px solid #DEE2E6',
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: '#2C3E50',
                  resize: 'vertical',
                  outline: 'none',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#C0392B'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#DEE2E6'}
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setShowRefuseModal(false)}
                disabled={refusing}
                style={{
                  minHeight: 48,
                  padding: '12px',
                  borderRadius: 7,
                  border: '1px solid #DEE2E6',
                  backgroundColor: '#FFFFFF',
                  color: '#6C757D',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: refusing ? 'not-allowed' : 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleRefuse}
                disabled={refusing || !refuseComment.trim()}
                style={{
                  minHeight: 48,
                  padding: '12px',
                  borderRadius: 7,
                  backgroundColor: refusing || !refuseComment.trim() ? '#ADB5BD' : '#C0392B',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: refusing || !refuseComment.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {refusing ? 'Envoi...' : '✕ Refuser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal signature */}
      {showSignModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="sign-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            backgroundColor:
              'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() =>
            !signing &&
            setShowSignModal(false)
          }
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight:
                'calc(100dvh - 32px)',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding:
                'clamp(22px, 6vw, 40px)',
              boxShadow:
                '0 16px 48px rgba(0,0,0,0.15)',
            }}
          >
            <h3
              id="sign-modal-title"
              style={{
                margin: '0 0 8px',
                fontSize: 20,
                lineHeight: 1.3,
                fontWeight: 700,
                color: '#2C3E50',
              }}
            >
              ✍️ Signer le document
            </h3>

            <p
              style={{
                margin: '0 0 24px',
                fontSize: 14,
                lineHeight: 1.6,
                color: '#6C757D',
              }}
            >
              En signant, vous confirmez
              avoir pris connaissance de ce
              document de conformité.
            </p>

            {/* Nom */}
            <div
              style={{
                marginBottom: 16,
              }}
            >
              <label
                htmlFor="sign-name"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: 6,
                }}
              >
                Nom complet *
              </label>

              <input
                id="sign-name"
                type="text"
                autoComplete="name"
                value={signName}
                onChange={(e) =>
                  setSignName(e.target.value)
                }
                style={{
                  width: '100%',
                  minHeight: 48,
                  padding: '12px 14px',
                  borderRadius: 7,
                  border:
                    '1px solid #DEE2E6',
                  fontSize: 16,
                  color: '#2C3E50',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor =
                    '#8E44AD';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor =
                    '#DEE2E6';
                }}
              />
            </div>

            {/* Commentaire */}
            <div
              style={{
                marginBottom: 24,
              }}
            >
              <label
                htmlFor="sign-comment"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: 6,
                }}
              >
                Commentaire (optionnel)
              </label>

              <textarea
                id="sign-comment"
                value={signComment}
                onChange={(e) =>
                  setSignComment(
                    e.target.value
                  )
                }
                placeholder="Ex: Document conforme à nos installations."
                rows={3}
                style={{
                  width: '100%',
                  minHeight: 96,
                  padding: '12px 14px',
                  borderRadius: 7,
                  border:
                    '1px solid #DEE2E6',
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: '#2C3E50',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>

            {/* Information signature */}
            <div
              style={{
                backgroundColor: '#F4ECF7',
                border: '1px solid #D2B4DE',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 24,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#8E44AD',
                  overflowWrap: 'anywhere',
                }}
              >
                🔒 Cette signature sera
                enregistrée avec votre nom,
                courriel ({user.email}) et la
                date/heure actuelle.
              </p>
            </div>

            {/* Actions modal */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowSignModal(false)
                }
                disabled={signing}
                style={{
                  minHeight: 48,
                  padding: '12px',
                  borderRadius: 7,
                  border:
                    '1px solid #DEE2E6',
                  backgroundColor:
                    '#FFFFFF',
                  color: '#6C757D',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: signing
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSign}
                disabled={
                  signing ||
                  !signName.trim()
                }
                style={{
                  minHeight: 48,
                  padding: '12px',
                  borderRadius: 7,
                  backgroundColor:
                    signing ||
                    !signName.trim()
                      ? '#ADB5BD'
                      : '#8E44AD',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor:
                    signing ||
                    !signName.trim()
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {signing
                  ? 'Signature...'
                  : '✓ Signer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}