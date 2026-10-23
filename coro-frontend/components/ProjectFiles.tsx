"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import api from "@/lib/api";

interface ProjectFile {
  id: string;
  name: string;
  category: string;
  size: number;
  mimeType: string;
  url: string;
  version: number;
  visibility: string;
  status: string;
  lifecycleState?:
    | "DRAFT"
    | "REVIEW"
    | "APPROVED"
    | "SUPERSEDED"
    | "REVOKED"
    | null;
  effectiveLifecycleState?: string;
  lockVersion: number;
  effectiveAt?: string | null;
  expiresAt?: string | null;
  isDownloadable?: boolean;
  createdAt: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
  uploadedByClient?: {
    firstName: string;
    lastName: string;
  };
  versions?: ProjectFile[];
}

const CATEGORIES = [
  {
    value: "plans_evacuation",
    label: "🚨 Plans d'évacuation",
  },
  {
    value: "plans_operation",
    label: "⚙️ Plans d'opération",
  },
  {
    value: "plans_implantation",
    label: "📐 Plans d'implantation",
  },
  {
    value: "documents_reference",
    label: "📚 Documents de référence",
  },
  {
    value: "fichiers_client",
    label: "👤 Fichiers client",
  },
  {
    value: "autre",
    label: "📎 Autre",
  },
];

const categoryLabel = (cat: string) =>
  CATEGORIES.find((c) => c.value === cat)?.label || cat;

const formatSize = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const lifecycleLabel = (file: ProjectFile) =>
  (
    ({
      DRAFT: "Brouillon",
      REVIEW: "En révision",
      APPROVED: "Approuvé",
      SUPERSEDED: "Remplacé",
      EXPIRED: "Expiré",
      NOT_EFFECTIVE: "À venir",
      REVOKED: "Révoqué",
      LEGACY_VALIDATED: "Validé (historique)",
      LEGACY: "Historique",
    }) as Record<string, string>
  )[file.effectiveLifecycleState || file.lifecycleState || "LEGACY"];

export default function ProjectFiles({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadForm, setUploadForm] = useState({
    category: "plans_evacuation",
    visibility: "shared",
    parentId: "",
  });

  const [expandedVersions, setExpandedVersions] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(`/project-files/project/${projectId}`);

      setFiles(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const resetUploadState = () => {
    setShowUploadModal(false);
    setSelectedFile(null);

    setUploadForm({
      category: "plans_evacuation",
      visibility: "shared",
      parentId: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert("Le fichier doit faire moins de 50 MB");
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setShowUploadModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);
      formData.append("category", uploadForm.category);
      formData.append("visibility", uploadForm.visibility);

      if (uploadForm.parentId) {
        formData.append("parentId", uploadForm.parentId);
      }

      await api.post(`/project-files/project/${projectId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      resetUploadState();
      await fetchFiles();
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléversement.");
    } finally {
      setUploading(false);
    }
  };

  const [lifecycleAction, setLifecycleAction] = useState<{ file: ProjectFile; action: "review" | "approve" | "revoke" } | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleEffectiveAt, setLifecycleEffectiveAt] = useState("");
  const [lifecycleExpiresAt, setLifecycleExpiresAt] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);
  const lifecycleDialogRef = useRef<HTMLDialogElement>(null);
  const lifecycleTriggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = lifecycleDialogRef.current;
    if (lifecycleAction && dialog && !dialog.open) dialog.showModal();
    if (!lifecycleAction && dialog?.open) dialog.close();
  }, [lifecycleAction]);
  const openLifecycleAction = (file: ProjectFile, action: "review" | "approve" | "revoke") => {
    lifecycleTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setLifecycleReason(""); setLifecycleEffectiveAt(""); setLifecycleExpiresAt(""); setLifecycleError("");
    setLifecycleAction({ file, action });
  };
  const closeLifecycleAction = () => {
    if (lifecycleSubmitting) return;
    setLifecycleAction(null);
    lifecycleTriggerRef.current?.focus();
  };
  const handleReview = (file: ProjectFile) => openLifecycleAction(file, "review");
  const handleApprove = (file: ProjectFile) => openLifecycleAction(file, "approve");
  const handleRevoke = (file: ProjectFile) => openLifecycleAction(file, "revoke");
  const confirmLifecycleAction = async () => {
    if (!lifecycleAction || lifecycleSubmitting) return;
    const reason = lifecycleReason.trim();
    if (reason.length < 8) { setLifecycleError("La justification doit contenir au moins 8 caractères."); return; }
    const { file, action } = lifecycleAction;
    const effective = lifecycleEffectiveAt ? new Date(lifecycleEffectiveAt) : new Date();
    const expires = lifecycleExpiresAt ? new Date(lifecycleExpiresAt) : null;
    if (action === "approve" && (!Number.isFinite(effective.getTime()) || (expires && (!Number.isFinite(expires.getTime()) || expires <= effective)))) {
      setLifecycleError("La fin de validité doit être postérieure à la prise d’effet."); return;
    }
    setLifecycleSubmitting(true); setLifecycleError("");
    try {
      await api.put(`/project-files/${file.id}/${action}`, {
        reason, requestId: crypto.randomUUID(), lockVersion: file.lockVersion,
        ...(action === "approve" ? { effectiveAt: effective.toISOString(), expiresAt: expires?.toISOString() ?? null } : {}),
      });
      setLifecycleAction(null);
      await fetchFiles();
      lifecycleTriggerRef.current?.focus();
    } catch {
      setLifecycleError("La transition a échoué. Actualisez les fichiers pour vérifier leur état avant de réessayer.");
    } finally { setLifecycleSubmitting(false); }
  };

  const handleDownload = async (file: ProjectFile) => {
    if (file.isDownloadable === false) return;
    if (file.url !== "private:project-file") {
      window.open(file.url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const response = await api.get(`/project-files/${file.id}/content`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error(err);
      alert("Erreur lors du telechargement.");
    }
  };

  const toggleVersions = (fileId: string) => {
    setExpandedVersions((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const prepareNewVersion = (file: ProjectFile) => {
    setUploadForm((f) => ({
      ...f,
      parentId: file.id,
      category: file.category,
    }));

    fileInputRef.current?.click();
  };

  const groupedFiles = CATEGORIES.map((cat) => ({
    ...cat,
    files: files.filter((file) => file.category === cat.value),
  })).filter((category) => category.files.length > 0);

  const inputStyle: React.CSSProperties = {
    border: "1px solid #CED4DA",
    color: "#2C3E50",
    backgroundColor: "#FFFFFF",
    width: "100%",
  };

  return (
    <div className="min-w-0">
      {/* ═══════════════════════════════════
          HEADER
      ═══════════════════════════════════ */}

      <div
        className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          sm:justify-between
          gap-3
          mb-6
        "
      >
        <div className="min-w-0">
          <h3
            className="
              font-semibold
              text-base
              sm:text-lg
              break-words
            "
            style={{
              color: "#2C3E50",
            }}
          >
            📁 Espace de fichiers
          </h3>

          <p
            className="
              text-xs
              mt-1
              leading-relaxed
            "
            style={{
              color: "#ADB5BD",
            }}
          >
            {files.length} fichier
            {files.length > 1 ? "s" : ""} — max 50 MB par fichier
          </p>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="
            w-full
            sm:w-auto
            min-h-[44px]
            flex
            items-center
            justify-center
            gap-2
            text-white
            text-sm
            font-medium
            px-4
            py-2.5
            rounded
            transition-colors
            flex-shrink-0
          "
          style={{
            backgroundColor: "#C0392B",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#A93226";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#C0392B";
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

      {/* ═══════════════════════════════════
          CHARGEMENT
      ═══════════════════════════════════ */}

      {loading ? (
        <p
          className="
            text-sm
            text-center
            py-8
            animate-pulse
          "
          style={{
            color: "#ADB5BD",
          }}
        >
          Chargement...
        </p>
      ) : files.length === 0 ? (
        /* ═══════════════════════════════════
           ÉTAT VIDE
        ═══════════════════════════════════ */

        <div
          className="
            text-center
            py-10
            sm:py-12
            px-4
            rounded-lg
          "
          style={{
            border: "2px dashed #E9ECEF",
            backgroundColor: "#F8F9FA",
          }}
        >
          <p className="text-4xl mb-3">📁</p>

          <p
            className="
              text-sm
              font-medium
              mb-2
            "
            style={{
              color: "#2C3E50",
            }}
          >
            Aucun fichier partagé
          </p>

          <p
            className="
              text-xs
              mb-4
              leading-relaxed
            "
            style={{
              color: "#ADB5BD",
            }}
          >
            PDF, PNG, JPG, DWG, DOCX, XLSX — Max 50 MB
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="
              w-full
              sm:w-auto
              min-h-[44px]
              text-sm
              font-medium
              px-4
              py-2.5
              rounded
            "
            style={{
              backgroundColor: "#C0392B",
              color: "#FFFFFF",
            }}
          >
            Déposer le premier fichier
          </button>
        </div>
      ) : (
        /* ═══════════════════════════════════
           GROUPES
        ═══════════════════════════════════ */

        <div className="space-y-6">
          {groupedFiles.map((group) => (
            <section key={group.value} className="min-w-0">
              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-wide
                  mb-3
                  break-words
                "
                style={{
                  color: "#ADB5BD",
                }}
              >
                {group.label}
              </p>

              <div className="space-y-2">
                {group.files.map((file) => (
                  <div key={file.id} className="min-w-0">
                    {/* FICHIER PRINCIPAL */}

                    <article
                      className="
                        rounded-lg
                        p-3.5
                        sm:p-4
                        min-w-0
                      "
                      style={{
                        backgroundColor: "#FFFFFF",

                        border: `1px solid ${
                          file.status === "valide" ? "#A9DFBF" : "#E9ECEF"
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
                        {/* INFO */}

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
                              flex-shrink-0
                            "
                            aria-hidden="true"
                          >
                            {file.mimeType?.includes("pdf")
                              ? "📄"
                              : file.mimeType?.includes("image")
                                ? "🖼️"
                                : file.name?.toLowerCase().endsWith(".dwg")
                                  ? "📐"
                                  : "📎"}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p
                              className="
                                text-sm
                                font-medium
                                leading-snug
                                break-words
                              "
                              style={{
                                color: "#2C3E50",
                              }}
                              title={file.name}
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
                                mt-1.5
                              "
                            >
                              <span
                                className="text-xs"
                                style={{
                                  color: "#ADB5BD",
                                }}
                              >
                                {formatSize(file.size)}
                              </span>

                              <span
                                aria-hidden="true"
                                style={{
                                  color: "#DEE2E6",
                                }}
                              >
                                ·
                              </span>

                              <span
                                className="text-xs"
                                style={{
                                  color: "#ADB5BD",
                                }}
                              >
                                v{file.version}
                                {" · "}
                                {new Date(file.createdAt).toLocaleDateString(
                                  "fr-CA",
                                  {
                                    day: "numeric",
                                    month: "short",
                                  },
                                )}
                              </span>

                              {file.uploadedBy && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      color: "#DEE2E6",
                                    }}
                                  >
                                    ·
                                  </span>

                                  <span
                                    className="
                                      text-xs
                                      break-words
                                    "
                                    style={{
                                      color: "#ADB5BD",
                                    }}
                                  >
                                    {file.uploadedBy.firstName}{" "}
                                    {file.uploadedBy.lastName}
                                  </span>
                                </>
                              )}

                              {file.uploadedByClient && (
                                <>
                                  <span
                                    aria-hidden="true"
                                    style={{
                                      color: "#DEE2E6",
                                    }}
                                  >
                                    ·
                                  </span>

                                  <span
                                    className="
                                      text-xs
                                      break-words
                                    "
                                    style={{
                                      color: "#ADB5BD",
                                    }}
                                  >
                                    Client : {file.uploadedByClient.firstName}{" "}
                                    {file.uploadedByClient.lastName}
                                  </span>
                                </>
                              )}

                              {file.visibility === "internal" && (
                                <span
                                  className="
                                    text-xs
                                    px-1.5
                                    py-0.5
                                    rounded
                                    whitespace-nowrap
                                  "
                                  style={{
                                    backgroundColor: "#FEF9E7",
                                    color: "#F39C12",
                                    border: "1px solid #FAD7A0",
                                  }}
                                >
                                  Interne
                                </span>
                              )}

                              {file.status === "valide" && (
                                <span
                                  className="
                                    text-xs
                                    px-1.5
                                    py-0.5
                                    rounded
                                    whitespace-nowrap
                                  "
                                  style={{
                                    backgroundColor: "#EAFAF1",
                                    color: "#27AE60",
                                    border: "1px solid #A9DFBF",
                                  }}
                                >
                                  ✓ Validé
                                </span>
                              )}

                              <span
                                className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap"
                                style={{
                                  color:
                                    file.isDownloadable === false
                                      ? "#C0392B"
                                      : "#2980B9",
                                  border: "1px solid currentColor",
                                }}
                              >
                                {lifecycleLabel(file)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ACTIONS */}

                        <div
                          className="
                            grid
                            grid-cols-2
                            sm:grid-cols-3
                            lg:flex
                            lg:flex-wrap
                            gap-2
                            flex-shrink-0
                          "
                        >
                          {file.versions && file.versions.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleVersions(file.id)}
                              className="
                                  min-h-[40px]
                                  text-xs
                                  px-3
                                  py-2
                                  rounded
                                  transition-colors
                                  whitespace-nowrap
                                "
                              style={{
                                border: "1px solid #DEE2E6",
                                color: "#6C757D",
                                backgroundColor: "#FFFFFF",
                              }}
                            >
                              {expandedVersions.includes(file.id) ? "▲" : "▼"}{" "}
                              {file.versions.length + 1} versions
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDownload(file)}
                            className="
                              min-h-[40px]
                              text-xs
                              px-3
                              py-2
                              rounded
                              transition-colors
                              whitespace-nowrap
                            "
                            style={{
                              border: "1px solid #AED6F1",
                              color: "#2980B9",
                              backgroundColor: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#EBF5FB";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }}
                          >
                            ↓ Télécharger
                          </button>

                          {file.lifecycleState === "DRAFT" && (
                            <button
                              type="button"
                              onClick={() => handleReview(file)}
                              className="
                                min-h-[40px]
                                text-xs
                                px-3
                                py-2
                                rounded
                                transition-colors
                                whitespace-nowrap
                              "
                              style={{
                                border: "1px solid #A9DFBF",
                                color: "#27AE60",
                                backgroundColor: "#FFFFFF",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#EAFAF1";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#FFFFFF";
                              }}
                            >
                              Demander la révision
                            </button>
                          )}

                          {file.lifecycleState === "REVIEW" && (
                            <button
                              type="button"
                              onClick={() => handleApprove(file)}
                              className="min-h-[40px] text-xs px-3 py-2 rounded transition-colors whitespace-nowrap"
                              style={{
                                border: "1px solid #A9DFBF",
                                color: "#27AE60",
                                backgroundColor: "#FFFFFF",
                              }}
                            >
                              Approuver
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => prepareNewVersion(file)}
                            className="
                              min-h-[40px]
                              text-xs
                              px-3
                              py-2
                              rounded
                              transition-colors
                              whitespace-nowrap
                            "
                            style={{
                              border: "1px solid #DEE2E6",
                              color: "#6C757D",
                              backgroundColor: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#F8F9FA";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }}
                          >
                            ↑ Nouvelle version
                          </button>

                          <button
                            type="button"
                            disabled={
                              file.lifecycleState === "REVOKED" ||
                              !file.lifecycleState
                            }
                            aria-label={`Révoquer ${file.name}`}
                            onClick={() => handleRevoke(file)}
                            className="
                              min-h-[40px]
                              text-xs
                              px-3
                              py-2
                              rounded
                              transition-colors
                            "
                            style={{
                              border: "1px solid #F1948A",
                              color: "#C0392B",
                              backgroundColor: "#FFFFFF",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = "#FDEDEC";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = "#FFFFFF";
                            }}
                          >
                            Révoquer
                          </button>
                        </div>
                      </div>
                    </article>

                    {/* ═══════════════════════
                        VERSIONS
                    ═══════════════════════ */}

                    {expandedVersions.includes(file.id) &&
                      file.versions &&
                      file.versions.length > 0 && (
                        <div
                          className="
                            mt-2
                            ml-0
                            sm:ml-6
                            lg:ml-8
                            space-y-1.5
                          "
                        >
                          {file.versions.map((version) => (
                            <article
                              key={version.id}
                              className="
                                  rounded
                                  p-3
                                  flex
                                  flex-col
                                  min-[420px]:flex-row
                                  min-[420px]:items-center
                                  min-[420px]:justify-between
                                  gap-3
                                  min-w-0
                                "
                              style={{
                                backgroundColor: "#F8F9FA",

                                border: "1px solid #E9ECEF",
                              }}
                            >
                              <div className="min-w-0">
                                <p
                                  className="
                                      text-xs
                                      font-medium
                                      leading-snug
                                      break-words
                                    "
                                  style={{
                                    color: "#6C757D",
                                  }}
                                >
                                  v{version.version} — {version.name}
                                </p>

                                <p
                                  className="
                                      text-xs
                                      mt-1
                                      leading-relaxed
                                      break-words
                                    "
                                  style={{
                                    color: "#ADB5BD",
                                  }}
                                >
                                  {formatSize(version.size)}
                                  {" · "}
                                  {new Date(
                                    version.createdAt,
                                  ).toLocaleDateString("fr-CA", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownload(version)}
                                className="
                                    w-full
                                    min-[420px]:w-auto
                                    min-h-[40px]
                                    text-xs
                                    px-3
                                    py-2
                                    rounded
                                    flex-shrink-0
                                  "
                                style={{
                                  border: "1px solid #DEE2E6",
                                  color: "#6C757D",
                                  backgroundColor: "#FFFFFF",
                                }}
                              >
                                ↓ Télécharger
                              </button>
                            </article>
                          ))}
                        </div>
                      )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════
          MODAL UPLOAD
      ═══════════════════════════════════ */}

      {showUploadModal && selectedFile && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-file-title"
          className="
              fixed
              inset-0
              flex
              items-center
              justify-center
              z-50
              p-4
              overflow-y-auto
            "
          style={{
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
          onClick={() => {
            if (!uploading) {
              resetUploadState();
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="
                w-full
                max-w-md
                rounded-lg
                p-5
                sm:p-6
                max-h-[calc(100dvh-32px)]
                overflow-y-auto
              "
            style={{
              backgroundColor: "#FFFFFF",

              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <h3
              id="upload-file-title"
              className="
                  font-semibold
                  text-lg
                  mb-4
                "
              style={{
                color: "#2C3E50",
              }}
            >
              Déposer un fichier
            </h3>

            {/* FICHIER */}

            <div
              className="
                  rounded-md
                  p-3
                  mb-4
                  min-w-0
                "
              style={{
                backgroundColor: "#F8F9FA",

                border: "1px solid #E9ECEF",
              }}
            >
              <p
                className="
                    text-sm
                    font-medium
                    break-words
                  "
                style={{
                  color: "#2C3E50",
                }}
              >
                {selectedFile.name}
              </p>

              <p
                className="
                    text-xs
                    mt-1
                  "
                style={{
                  color: "#ADB5BD",
                }}
              >
                {formatSize(selectedFile.size)}
              </p>
            </div>

            <div className="space-y-4">
              {/* CATÉGORIE */}

              <div>
                <label
                  htmlFor="file-category"
                  className="
                      block
                      text-sm
                      font-medium
                      mb-1.5
                    "
                  style={{
                    color: "#495057",
                  }}
                >
                  Catégorie
                </label>

                <select
                  id="file-category"
                  value={uploadForm.category}
                  onChange={(e) =>
                    setUploadForm((f) => ({
                      ...f,
                      category: e.target.value,
                    }))
                  }
                  className="
                      rounded
                      px-4
                      py-2.5
                      text-base
                      sm:text-sm
                      min-h-[46px]
                      focus:outline-none
                    "
                  style={inputStyle}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* VISIBILITÉ */}

              <div>
                <label
                  htmlFor="file-visibility"
                  className="
                      block
                      text-sm
                      font-medium
                      mb-1.5
                    "
                  style={{
                    color: "#495057",
                  }}
                >
                  Visibilité
                </label>

                <select
                  id="file-visibility"
                  value={uploadForm.visibility}
                  onChange={(e) =>
                    setUploadForm((f) => ({
                      ...f,
                      visibility: e.target.value,
                    }))
                  }
                  className="
                      rounded
                      px-4
                      py-2.5
                      text-base
                      sm:text-sm
                      min-h-[46px]
                      focus:outline-none
                    "
                  style={inputStyle}
                >
                  <option value="shared">🌐 Partagé avec le client</option>

                  <option value="internal">🔒 Interne seulement</option>
                </select>
              </div>

              {/* VERSION */}

              {uploadForm.parentId && (
                <div
                  className="
                      rounded
                      p-3
                    "
                  style={{
                    backgroundColor: "#EBF5FB",

                    border: "1px solid #AED6F1",
                  }}
                >
                  <p
                    className="
                        text-xs
                        leading-relaxed
                      "
                    style={{
                      color: "#2980B9",
                    }}
                  >
                    📎 Ce fichier sera ajouté comme nouvelle version d&apos;un
                    fichier existant.
                  </p>
                </div>
              )}
            </div>

            {/* ACTIONS MODAL */}

            <div
              className="
                  grid
                  grid-cols-1
                  sm:grid-cols-2
                  gap-2.5
                  mt-6
                "
            >
              <button
                type="button"
                onClick={resetUploadState}
                disabled={uploading}
                className="
                    min-h-[48px]
                    px-4
                    py-2.5
                    rounded
                    text-sm
                    font-medium
                    disabled:opacity-50
                  "
                style={{
                  border: "1px solid #DEE2E6",
                  color: "#6C757D",
                  backgroundColor: "#FFFFFF",
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="
                    min-h-[48px]
                    px-4
                    py-2.5
                    rounded
                    text-sm
                    font-medium
                    text-white
                    disabled:opacity-50
                  "
                style={{
                  backgroundColor: "#C0392B",
                }}
              >
                {uploading ? "Téléversement..." : "↑ Déposer"}
              </button>
            </div>
          </div>
        </div>
      )}
      <dialog ref={lifecycleDialogRef} aria-labelledby="file-lifecycle-title" onCancel={(event) => { event.preventDefault(); closeLifecycleAction(); }} className="m-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl backdrop:bg-black/40">
        {lifecycleAction && <form onSubmit={(event) => { event.preventDefault(); void confirmLifecycleAction(); }}>
          <h3 id="file-lifecycle-title" className="text-lg font-semibold">
            {lifecycleAction.action === "review" ? "Mettre en révision" : lifecycleAction.action === "approve" ? "Approuver la version" : "Révoquer la version"}
          </h3>
          <p className="my-3 break-words text-sm">{lifecycleAction.file.name} · Version {lifecycleAction.file.version}</p>
          <label className="block text-sm">Justification
            <textarea autoFocus required minLength={8} maxLength={2000} value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} disabled={lifecycleSubmitting} className="mt-1 w-full rounded border p-2" />
          </label>
          {lifecycleAction.action === "approve" && <div className="mt-3 space-y-3">
            <label className="block text-sm">Prise d’effet (heure locale, vide : maintenant)
              <input type="datetime-local" value={lifecycleEffectiveAt} onChange={(event) => setLifecycleEffectiveAt(event.target.value)} disabled={lifecycleSubmitting} className="mt-1 w-full rounded border p-2" />
            </label>
            <label className="block text-sm">Fin de validité (facultatif)
              <input type="datetime-local" value={lifecycleExpiresAt} onChange={(event) => setLifecycleExpiresAt(event.target.value)} disabled={lifecycleSubmitting} className="mt-1 w-full rounded border p-2" />
            </label>
          </div>}
          {lifecycleError && <p role="alert" className="mt-3 text-sm text-red-700">{lifecycleError}</p>}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={closeLifecycleAction} disabled={lifecycleSubmitting} className="rounded border px-4 py-2">Annuler</button>
            <button type="submit" disabled={lifecycleSubmitting || lifecycleReason.trim().length < 8} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{lifecycleSubmitting ? "Enregistrement…" : "Confirmer"}</button>
          </div>
        </form>}
      </dialog>
    </div>
  );
}
