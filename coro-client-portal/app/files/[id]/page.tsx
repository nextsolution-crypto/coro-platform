'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUser, apiGet } from '../../store/auth';
import PortalLayout from '../../components/PortalLayout';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3002/api';

const CATEGORIES = [
  {
    value: 'plans_evacuation',
    label: "🚨 Plans d'évacuation",
  },
  {
    value: 'plans_operation',
    label: "⚙️ Plans d'opération",
  },
  {
    value: 'plans_implantation',
    label: "📐 Plans d'implantation",
  },
  {
    value: 'documents_reference',
    label: '📚 Documents de référence',
  },
  {
    value: 'fichiers_client',
    label: '👤 Fichiers client',
  },
  {
    value: 'autre',
    label: '📎 Autre',
  },
];

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProjectFilesClientPage() {
  const router = useRouter();
  const params = useParams();

  const projectId = params?.id as string;

  const [user, setUser] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [category, setCategory] =
    useState('fichiers_client');

  const [comment, setComment] =
    useState('');

  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [projectRes, filesRes] =
        await Promise.all([
          apiGet(
            `/client-portal/projects/${projectId}`
          ),

          apiGet(
            `/project-files/project/${projectId}?visibility=shared`
          ),
        ]);

      setProject(projectRes);

      setFiles(
        (filesRes || []).filter(
          (file: any) =>
            file.visibility === 'shared'
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const currentUser = getUser();

    if (!currentUser) {
      router.replace('/login');
      return;
    }

    setUser(currentUser);
    fetchData();
  }, [router, fetchData]);

  const resetUpload = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setCategory('fichiers_client');
    setComment('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert(
        'Le fichier doit faire moins de 50 MB'
      );

      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);

    try {
      const token =
        localStorage.getItem(
          'coro_client_token'
        );

      const formData = new FormData();

      formData.append(
        'file',
        selectedFile
      );

      formData.append(
        'category',
        category
      );

      formData.append(
        'visibility',
        'shared'
      );

      if (comment.trim()) {
        formData.append(
          'comment',
          comment.trim()
        );
      }

      const res = await fetch(
        `${API_URL}/project-files/client/${projectId}`,
        {
          method: 'POST',

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          body: formData,
        }
      );

      if (!res.ok) {
        throw new Error(
          'Erreur upload'
        );
      }

      resetUpload();
      await fetchData();

    } catch (err) {
      console.error(err);

      alert(
        'Erreur lors du téléversement.'
      );

    } finally {
      setUploading(false);
    }
  };

  const handleView = (file: any) => {
    const viewerUrl =
      `https://docs.google.com/viewer?url=${
        encodeURIComponent(file.url)
      }&embedded=false`;

    window.open(
      viewerUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleDownload = (
    file: any
  ) => {
    window.open(
      file.url,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleAnnotatedUpload = () => {
    setCategory('fichiers_client');
    fileInputRef.current?.click();
  };

  const groupedFiles =
    CATEGORIES.map(categoryItem => ({
      ...categoryItem,

      files: files.filter(
        file =>
          file.category ===
          categoryItem.value
      ),
    })).filter(
      group =>
        group.files.length > 0
    );

  if (loading || !user) {
    return (
      <PortalLayout>
        <div
          className="
            flex
            items-center
            justify-center
            min-h-[300px]
            px-4
          "
        >
          <p
            className="
              animate-pulse
              text-sm
            "
            style={{
              color: '#ADB5BD',
            }}
          >
            Chargement...
          </p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>

      {/* ═══════════════════════════════
          RETOUR
      ═══════════════════════════════ */}

      <button
        type="button"
        onClick={() =>
          router.push('/documents')
        }
        className="
          inline-flex
          items-center
          gap-2
          mb-5
          px-1
          py-2
          text-sm
        "
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#6C757D',
        }}
      >
        ← Retour aux documents
      </button>


      {/* ═══════════════════════════════
          HEADER
      ═══════════════════════════════ */}

      <header className="mb-6 sm:mb-7">

        <p
          className="
            mb-1
            text-xs
            font-bold
            uppercase
            tracking-[0.08em]
          "
          style={{
            color: '#ADB5BD',
          }}
        >
          Espace de fichiers
        </p>

        <div
          className="
            flex
            flex-col
            sm:flex-row
            sm:items-center
            sm:justify-between
            gap-3
          "
        >
          <h1
            className="
              m-0
              flex-1
              min-w-0
              text-[22px]
              sm:text-[26px]
              font-extrabold
              leading-tight
              break-words
            "
            style={{
              color: '#2C3E50',
            }}
          >
            {project?.name}
          </h1>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="
              w-full
              sm:w-auto
              min-h-[46px]
              px-5
              py-2.5
              rounded-lg
              text-sm
              font-bold
              flex-shrink-0
              transition-colors
            "
            style={{
              backgroundColor: '#C0392B',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor =
                '#A93226';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor =
                '#C0392B';
            }}
          >
            + Déposer un fichier
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.dwg,.docx,.xlsx,.zip"
          />
        </div>

      </header>


      {/* ═══════════════════════════════
          INFO
      ═══════════════════════════════ */}

      <div
        className="
          rounded-lg
          px-4
          py-3
          mb-6
        "
        style={{
          backgroundColor: '#EBF5FB',
          border: '1px solid #AED6F1',
        }}
      >
        <p
          className="
            m-0
            text-[13px]
            leading-relaxed
          "
          style={{
            color: '#1A5276',
          }}
        >
          💡 Téléchargez les plans de votre
          conseiller, annotez-les et
          redéposez-les ici. Votre conseiller
          sera notifié automatiquement.
        </p>
      </div>


      {/* ═══════════════════════════════
          ÉTAT VIDE
      ═══════════════════════════════ */}

      {files.length === 0 ? (

        <section
          className="
            rounded-xl
            px-4
            py-10
            sm:py-14
            lg:py-16
            text-center
          "
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E9ECEF',
          }}
        >
          <p className="text-5xl mb-4">
            📁
          </p>

          <p
            className="
              mb-2
              text-base
              font-bold
            "
            style={{
              color: '#2C3E50',
            }}
          >
            Aucun fichier partagé
          </p>

          <p
            className="
              mb-6
              text-sm
              leading-relaxed
            "
            style={{
              color: '#ADB5BD',
            }}
          >
            Votre conseiller n&apos;a pas
            encore partagé de fichiers.
          </p>

          <button
            type="button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="
              w-full
              sm:w-auto
              min-h-[46px]
              px-5
              py-2.5
              rounded-lg
              text-sm
              font-bold
            "
            style={{
              backgroundColor: '#C0392B',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Déposer un fichier
          </button>
        </section>

      ) : (

        /* ═══════════════════════════════
           GROUPES
        ═══════════════════════════════ */

        <div
          className="
            flex
            flex-col
            gap-6
            min-w-0
          "
        >
          {groupedFiles.map(group => (

            <section
              key={group.value}
              className="min-w-0"
            >

              <p
                className="
                  mb-3
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.06em]
                  break-words
                "
                style={{
                  color: '#ADB5BD',
                }}
              >
                {group.label}
              </p>


              <div
                className="
                  flex
                  flex-col
                  gap-2
                "
              >

                {group.files.map(
                  (file: any) => (

                    <article
                      key={file.id}
                      className="
                        rounded-xl
                        p-3.5
                        sm:p-4
                        lg:p-5
                        min-w-0
                      "
                      style={{
                        backgroundColor:
                          '#FFFFFF',

                        border:
                          `1px solid ${
                            file.status ===
                            'valide'
                              ? '#A9DFBF'
                              : '#E9ECEF'
                          }`,
                      }}
                    >

                      <div
                        className="
                          flex
                          flex-col
                          lg:flex-row
                          lg:items-start
                          lg:justify-between
                          gap-4
                        "
                      >

                        {/* INFO FICHIER */}

                        <div
                          className="
                            flex
                            items-start
                            gap-3
                            flex-1
                            min-w-0
                          "
                        >
                          <span
                            className="
                              text-2xl
                              sm:text-[28px]
                              flex-shrink-0
                            "
                            aria-hidden="true"
                          >
                            {file.mimeType
                              ?.includes(
                                'pdf'
                              )
                              ? '📄'
                              : file.mimeType
                                  ?.includes(
                                    'image'
                                  )
                                ? '🖼️'
                                : file.name
                                    ?.toLowerCase()
                                    .endsWith(
                                      '.dwg'
                                    )
                                  ? '📐'
                                  : '📎'}
                          </span>


                          <div
                            className="
                              flex-1
                              min-w-0
                            "
                          >

                            <p
                              className="
                                m-0
                                mb-1
                                text-sm
                                font-bold
                                leading-snug
                                break-words
                              "
                              style={{
                                color:
                                  '#2C3E50',
                              }}
                            >
                              {file.name}
                            </p>


                            <div
                              className="
                                flex
                                flex-wrap
                                items-center
                                gap-x-2
                                gap-y-1
                                text-xs
                              "
                              style={{
                                color:
                                  '#ADB5BD',
                              }}
                            >

                              <span>
                                {formatSize(
                                  file.size
                                )}
                              </span>

                              <span
                                aria-hidden="true"
                              >
                                ·
                              </span>

                              <span>
                                v
                                {file.version}
                              </span>

                              <span
                                aria-hidden="true"
                              >
                                ·
                              </span>

                              <span>
                                {new Date(
                                  file.createdAt
                                ).toLocaleDateString(
                                  'fr-CA',
                                  {
                                    day:
                                      'numeric',
                                    month:
                                      'short',
                                  }
                                )}
                              </span>


                              {file.status ===
                                'valide' && (
                                <span
                                  className="
                                    font-semibold
                                    whitespace-nowrap
                                  "
                                  style={{
                                    color:
                                      '#27AE60',
                                  }}
                                >
                                  ✓ Validé
                                </span>
                              )}

                            </div>

                          </div>
                        </div>


                        {/* ═══════════════════
                            ACTIONS
                        ═══════════════════ */}

                        <div
                          className="
                            grid
                            grid-cols-1
                            min-[420px]:grid-cols-2
                            sm:grid-cols-3
                            lg:flex
                            lg:flex-wrap
                            gap-2
                            flex-shrink-0
                          "
                        >

                          {file.mimeType
                            ?.includes(
                              'pdf'
                            ) && (

                            <button
                              type="button"
                              onClick={() =>
                                handleView(
                                  file
                                )
                              }
                              className="
                                min-h-[42px]
                                px-3.5
                                py-2
                                rounded-md
                                text-[13px]
                                font-semibold
                                transition-colors
                                whitespace-nowrap
                              "
                              style={{
                                border:
                                  '2px solid #2980B9',

                                backgroundColor:
                                  '#FFFFFF',

                                color:
                                  '#2980B9',

                                cursor:
                                  'pointer',
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.backgroundColor =
                                  '#EBF5FB';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.backgroundColor =
                                  '#FFFFFF';
                              }}
                            >
                              👁 Visualiser
                            </button>

                          )}


                          <button
                            type="button"
                            onClick={() =>
                              handleDownload(
                                file
                              )
                            }
                            className="
                              min-h-[42px]
                              px-3.5
                              py-2
                              rounded-md
                              text-[13px]
                              font-semibold
                              transition-colors
                              whitespace-nowrap
                            "
                            style={{
                              border: 'none',

                              backgroundColor:
                                '#C0392B',

                              color:
                                '#FFFFFF',

                              cursor:
                                'pointer',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor =
                                '#A93226';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor =
                                '#C0392B';
                            }}
                          >
                            ↓ Télécharger
                          </button>


                          <button
                            type="button"
                            onClick={
                              handleAnnotatedUpload
                            }
                            className="
                              min-h-[42px]
                              px-3.5
                              py-2
                              rounded-md
                              text-[13px]
                              font-semibold
                              transition-colors
                              whitespace-nowrap

                              min-[420px]:col-span-2
                              sm:col-span-1
                            "
                            style={{
                              border:
                                '1px solid #DEE2E6',

                              backgroundColor:
                                '#FFFFFF',

                              color:
                                '#6C757D',

                              cursor:
                                'pointer',
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor =
                                '#F8F9FA';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor =
                                '#FFFFFF';
                            }}
                          >
                            ↑ Redéposer annoté
                          </button>

                        </div>

                      </div>

                    </article>

                  )
                )}

              </div>

            </section>

          ))}

        </div>

      )}


      {/* ═══════════════════════════════
          MODALE UPLOAD
      ═══════════════════════════════ */}

      {showUploadModal &&
        selectedFile && (

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-title"

            className="
              fixed
              inset-0
              z-[1000]
              flex
              items-center
              justify-center
              p-4
              overflow-y-auto
            "

            style={{
              backgroundColor:
                'rgba(0,0,0,0.45)',
            }}

            onClick={() => {
              if (!uploading) {
                resetUpload();
              }
            }}
          >

            <div
              className="
                w-full
                max-w-[440px]
                rounded-xl
                p-5
                sm:p-7
                lg:p-9
                overflow-y-auto
                max-h-[calc(100dvh-32px)]
              "

              style={{
                backgroundColor:
                  '#FFFFFF',

                boxShadow:
                  '0 16px 48px rgba(0,0,0,0.15)',
              }}

              onClick={e =>
                e.stopPropagation()
              }
            >

              <h3
                id="upload-title"
                className="
                  m-0
                  mb-2
                  text-lg
                  font-bold
                "
                style={{
                  color: '#2C3E50',
                }}
              >
                Déposer un fichier
              </h3>


              {/* FICHIER SÉLECTIONNÉ */}

              <div
                className="
                  rounded-lg
                  px-4
                  py-3
                  my-4
                  min-w-0
                "

                style={{
                  backgroundColor:
                    '#F8F9FA',

                  border:
                    '1px solid #E9ECEF',
                }}
              >

                <p
                  className="
                    m-0
                    mb-1
                    text-sm
                    font-semibold
                    leading-snug
                    break-words
                  "

                  style={{
                    color: '#2C3E50',
                  }}
                >
                  {selectedFile.name}
                </p>

                <p
                  className="
                    m-0
                    text-[13px]
                  "

                  style={{
                    color: '#ADB5BD',
                  }}
                >
                  {formatSize(
                    selectedFile.size
                  )}
                </p>

              </div>


              {/* CATÉGORIE */}

              <div className="mb-4">

                <label
                  htmlFor="client-file-category"
                  className="
                    block
                    text-[13px]
                    font-semibold
                    mb-1.5
                  "

                  style={{
                    color: '#495057',
                  }}
                >
                  Catégorie
                </label>

                <select
                  id="client-file-category"

                  value={category}

                  onChange={e =>
                    setCategory(
                      e.target.value
                    )
                  }

                  className="
                    w-full
                    min-w-0
                    min-h-[46px]
                    px-3
                    py-2.5
                    rounded-lg
                    text-base
                    outline-none
                  "

                  style={{
                    border:
                      '1px solid #DEE2E6',

                    color:
                      '#2C3E50',

                    backgroundColor:
                      '#FFFFFF',
                  }}
                >

                  {CATEGORIES.map(
                    categoryItem => (

                      <option
                        key={
                          categoryItem.value
                        }

                        value={
                          categoryItem.value
                        }
                      >
                        {
                          categoryItem.label
                        }
                      </option>

                    )
                  )}

                </select>

              </div>


              {/* COMMENTAIRE */}

              <div className="mb-5">

                <label
                  htmlFor="client-file-comment"
                  className="
                    block
                    text-[13px]
                    font-semibold
                    mb-1.5
                  "

                  style={{
                    color: '#495057',
                  }}
                >
                  Commentaire (optionnel)
                </label>

                <textarea
                  id="client-file-comment"

                  value={comment}

                  onChange={e =>
                    setComment(
                      e.target.value
                    )
                  }

                  placeholder="Ex: J'ai annoté les sorties de secours du 3e étage"

                  rows={3}

                  className="
                    w-full
                    min-w-0
                    min-h-[96px]
                    px-3.5
                    py-3
                    rounded-lg
                    text-base
                    leading-relaxed
                    resize-y
                    outline-none
                  "

                  style={{
                    border:
                      '1px solid #DEE2E6',

                    color:
                      '#2C3E50',

                    backgroundColor:
                      '#FFFFFF',
                  }}
                />

              </div>


              {/* ACTIONS */}

              <div
                className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-2.5
                "
              >

                <button
                  type="button"

                  onClick={
                    resetUpload
                  }

                  disabled={
                    uploading
                  }

                  className="
                    min-h-[48px]
                    px-4
                    py-3
                    rounded-lg
                    text-sm
                    font-semibold
                    disabled:opacity-50
                  "

                  style={{
                    border:
                      '1px solid #DEE2E6',

                    backgroundColor:
                      '#FFFFFF',

                    color:
                      '#6C757D',

                    cursor:
                      uploading
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  Annuler
                </button>


                <button
                  type="button"

                  onClick={
                    handleUpload
                  }

                  disabled={
                    uploading
                  }

                  className="
                    min-h-[48px]
                    px-4
                    py-3
                    rounded-lg
                    text-sm
                    font-bold
                  "

                  style={{
                    backgroundColor:
                      uploading
                        ? '#ADB5BD'
                        : '#C0392B',

                    color:
                      '#FFFFFF',

                    border: 'none',

                    cursor:
                      uploading
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {uploading
                    ? 'Envoi...'
                    : '↑ Déposer'}
                </button>

              </div>

            </div>

          </div>

        )}

    </PortalLayout>
  );
}