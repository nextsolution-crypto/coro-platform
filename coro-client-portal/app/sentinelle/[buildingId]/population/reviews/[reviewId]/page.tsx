"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import PortalLayout from "../../../../../components/PortalLayout";
import {
  apiGet,
  apiPost,
  apiPut,
  apiUpload,
  getUser,
} from "../../../../../store/auth";
import {
  actionStatusLabel,
  confidentialityLabel,
  evidenceTypeLabel,
  findingCategoryLabel,
  isOverdue,
  recommendationStatusLabel,
  reviewStatusLabel,
  severityLabel,
} from "../reviewState";
import styles from "./review.module.css";

const uuid = () => crypto.randomUUID();
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-CA") : "Non disponible";

export default function PopulationReviewPage() {
  const { buildingId, reviewId } = useParams<{
    buildingId: string;
    reviewId: string;
  }>();
  const router = useRouter();
  const user = getUser();
  const rex = new Set(user?.operationalReviewPermissions ?? []);
  const cap = new Set(user?.correctiveActionPermissions ?? []);
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [summary, setSummary] = useState({ title: "", summary: "" });
  const [finding, setFinding] = useState({
    category: "OBSERVATION",
    severity: "MEDIUM",
    title: "",
    description: "",
    impact: "",
  });
  const [findingOpen, setFindingOpen] = useState(false);
  const [recommendationFor, setRecommendationFor] = useState<string | null>(
    null,
  );
  const [recommendation, setRecommendation] = useState({
    title: "",
    description: "",
    rationale: "",
    priority: "MEDIUM",
  });
  const [actionFor, setActionFor] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState({
    title: "",
    description: "",
    category: "GENERAL",
    priority: "WARNING",
    dueDate: "",
  });
  const [openAction, setOpenAction] = useState<string | null>(null);
  const [actionDetails, setActionDetails] = useState<
    Record<string, { evidence: any[]; verifications: any[] }>
  >({});
  const [evidenceForm, setEvidenceForm] = useState({
    type: "NOTE",
    title: "",
    text: "",
    url: "",
  });

  const load = useCallback(
    async (background = false) => {
      background ? setRefreshing(true) : setLoading(true);
      try {
        const result = (await apiGet(
          `/client-portal/operational-reviews/${reviewId}`,
        )) as any;
        setReview(result);
        setSummary({
          title: result.title ?? "",
          summary: result.summary ?? "",
        });
        setError(null);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Le retour d'expérience n'a pas pu être chargé.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [reviewId],
  );

  useEffect(() => {
    if (!user) router.replace("/login");
    else void load();
  }, [reviewId]);
  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const mutate = async (
    key: string,
    work: () => Promise<unknown>,
    success: string,
  ) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    try {
      await work();
      await load(true);
      setMessage(success);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "L'opération n'a pas pu être terminée.",
      );
      await load(true);
    } finally {
      setBusy(null);
    }
  };

  const loadAction = async (id: string) => {
    setOpenAction(id);
    const [evidence, verifications] = await Promise.all([
      apiGet(`/client-portal/corrective-actions/${id}/evidence`),
      apiGet(`/client-portal/corrective-actions/${id}/verifications`),
    ]);
    setActionDetails((current) => ({
      ...current,
      [id]: {
        evidence: evidence as any[],
        verifications: verifications as any[],
      },
    }));
  };

  if (loading)
    return (
      <PortalLayout>
        <main className={styles.page}>
          <LoaderCircle className={styles.spinner} /> Chargement du retour
          d&apos;expérience...
        </main>
      </PortalLayout>
    );
  if (!review)
    return (
      <PortalLayout>
        <main className={styles.page}>
          <button className={styles.back} onClick={() => router.back()}>
            <ArrowLeft size={18} />
            Retour
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </main>
      </PortalLayout>
    );
  const editable = review.status === "DRAFT" && rex.has("REX_EDIT");

  return (
    <PortalLayout>
      <main className={styles.page}>
        <button
          className={styles.back}
          onClick={() => router.push(`/sentinelle/${buildingId}/population`)}
        >
          <ArrowLeft size={18} />
          Sentinelle Population
        </button>
        <header className={styles.header}>
          <span className={styles.eyebrow}>RETOUR D&apos;EXPÉRIENCE</span>
          <h1>{review.reference}</h1>
          <div className={styles.meta}>
            <strong>{reviewStatusLabel[review.status]}</strong>
            <span>{confidentialityLabel[review.confidentiality]}</span>
            <span>
              Dossier de preuve : {review.evidenceReference ?? "non généré"}
            </span>
            <button
              className={styles.buttonSecondary}
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                size={15}
                className={refreshing ? styles.spinner : ""}
              />{" "}
              Actualiser
            </button>
          </div>
        </header>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className={styles.success} role="status">
            {message}
          </p>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionTitle}>SYNTHÈSE</span>
              <h2>Synthèse du retour d&apos;expérience</h2>
            </div>
          </div>
          <div className={styles.formGrid}>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label htmlFor="review-title">Titre</label>
              <input
                id="review-title"
                value={summary.title}
                disabled={!editable}
                onChange={(e) =>
                  setSummary({ ...summary, title: e.target.value })
                }
              />
            </div>
            <div className={`${styles.field} ${styles.fieldFull}`}>
              <label htmlFor="review-summary">Résumé</label>
              <textarea
                id="review-summary"
                value={summary.summary}
                disabled={!editable}
                onChange={(e) =>
                  setSummary({ ...summary, summary: e.target.value })
                }
              />
            </div>
          </div>
          {editable && (
            <div className={styles.actions}>
              <button
                className={styles.button}
                disabled={busy !== null}
                onClick={() =>
                  void mutate(
                    "summary",
                    () =>
                      apiPut(
                        `/client-portal/operational-reviews/${reviewId}`,
                        summary,
                      ),
                    "Synthèse enregistrée.",
                  )
                }
              >
                {busy === "summary" ? "ENREGISTREMENT..." : "ENREGISTRER"}
              </button>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionTitle}>ANALYSE</span>
              <h2>Constats</h2>
            </div>
            {editable && (
              <button
                className={styles.buttonSecondary}
                onClick={() => setFindingOpen(!findingOpen)}
              >
                + AJOUTER UN CONSTAT
              </button>
            )}
          </div>
          {findingOpen && (
            <div className={styles.mutator}>
              <div className={styles.formGrid}>
                <Field label="Catégorie">
                  <select
                    value={finding.category}
                    onChange={(e) =>
                      setFinding({ ...finding, category: e.target.value })
                    }
                  >
                    {Object.entries(findingCategoryLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Gravité">
                  <select
                    value={finding.severity}
                    onChange={(e) =>
                      setFinding({ ...finding, severity: e.target.value })
                    }
                  >
                    {Object.entries(severityLabel).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Titre" full>
                  <input
                    value={finding.title}
                    onChange={(e) =>
                      setFinding({ ...finding, title: e.target.value })
                    }
                  />
                </Field>
                <Field label="Description" full>
                  <textarea
                    value={finding.description}
                    onChange={(e) =>
                      setFinding({ ...finding, description: e.target.value })
                    }
                  />
                </Field>
                <Field label="Impact (optionnel)" full>
                  <textarea
                    value={finding.impact}
                    onChange={(e) =>
                      setFinding({ ...finding, impact: e.target.value })
                    }
                  />
                </Field>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.button}
                  disabled={
                    busy !== null || !finding.title || !finding.description
                  }
                  onClick={() =>
                    void mutate(
                      "finding",
                      () =>
                        apiPost(
                          `/client-portal/operational-reviews/${reviewId}/findings`,
                          finding,
                        ),
                      "Constat ajouté.",
                    ).then(() => {
                      setFindingOpen(false);
                      setFinding({
                        ...finding,
                        title: "",
                        description: "",
                        impact: "",
                      });
                    })
                  }
                >
                  AJOUTER
                </button>
              </div>
            </div>
          )}
          {!review.findings?.length && (
            <p className={styles.empty}>Aucun constat.</p>
          )}
          {review.findings?.map((f: any, index: number) => (
            <article className={styles.finding} key={f.id}>
              <div className={styles.findingHead}>
                <div>
                  <span className={styles.pill}>
                    CONSTAT {index + 1} · {findingCategoryLabel[f.category]}
                  </span>
                  <h3>{f.title}</h3>
                </div>
                <strong>{severityLabel[f.severity]}</strong>
              </div>
              <p>{f.description}</p>
              {f.impact && (
                <p>
                  <strong>Impact :</strong> {f.impact}
                </p>
              )}
              <div className={styles.recommendations}>
                <div className={styles.sectionHead}>
                  <strong>RECOMMANDATIONS</strong>
                  {editable && (
                    <button
                      className={styles.buttonSecondary}
                      onClick={() =>
                        setRecommendationFor(
                          recommendationFor === f.id ? null : f.id,
                        )
                      }
                    >
                      + AJOUTER
                    </button>
                  )}
                </div>
                {recommendationFor === f.id && (
                  <div className={styles.mutator}>
                    <Field label="Titre">
                      <input
                        value={recommendation.title}
                        onChange={(e) =>
                          setRecommendation({
                            ...recommendation,
                            title: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <Field label="Description">
                      <textarea
                        value={recommendation.description}
                        onChange={(e) =>
                          setRecommendation({
                            ...recommendation,
                            description: e.target.value,
                          })
                        }
                      />
                    </Field>
                    <div className={styles.actions}>
                      <button
                        className={styles.button}
                        disabled={!recommendation.description || busy !== null}
                        onClick={() =>
                          void mutate(
                            "recommendation",
                            () =>
                              apiPost(
                                `/client-portal/operational-reviews/${reviewId}/findings/${f.id}/recommendations`,
                                recommendation,
                              ),
                            "Recommandation ajoutée.",
                          ).then(() => setRecommendationFor(null))
                        }
                      >
                        AJOUTER
                      </button>
                    </div>
                  </div>
                )}
                {f.recommendations?.map((r: any) => (
                  <div className={styles.recommendation} key={r.id}>
                    <strong>{r.title || "Recommandation"}</strong>
                    <p>{r.description}</p>
                    <span className={styles.pill}>
                      {recommendationStatusLabel[r.status]}
                    </span>
                    {review.status === "IN_REVIEW" &&
                      rex.has("REX_REVIEW") &&
                      r.status === "PROPOSED" && (
                        <div className={styles.actions}>
                          {[
                            ["ACCEPTED", "ACCEPTER"],
                            ["DEFERRED", "REPORTER"],
                            ["REJECTED", "REJETER"],
                          ].map(([status, label]) => (
                            <button
                              key={status}
                              className={
                                status === "ACCEPTED"
                                  ? styles.button
                                  : styles.buttonSecondary
                              }
                              disabled={busy !== null}
                              onClick={() => {
                                const decisionComment =
                                  status === "ACCEPTED"
                                    ? undefined
                                    : window.prompt(
                                        "Commentaire de décision",
                                      ) || undefined;
                                if (status !== "ACCEPTED" && !decisionComment)
                                  return;
                                void mutate(
                                  `decision-${r.id}`,
                                  () =>
                                    apiPost(
                                      `/client-portal/operational-reviews/${reviewId}/recommendations/${r.id}/decision`,
                                      { status, decisionComment },
                                    ),
                                  "Décision enregistrée.",
                                );
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    {r.status === "ACCEPTED" &&
                      cap.has("CORRECTIVE_ACTION_CREATE") && (
                        <button
                          className={styles.buttonSecondary}
                          onClick={() =>
                            setActionFor(actionFor === r.id ? null : r.id)
                          }
                        >
                          + CRÉER UNE ACTION CORRECTIVE
                        </button>
                      )}
                    {actionFor === r.id && (
                      <ActionForm
                        value={actionForm}
                        setValue={setActionForm}
                        disabled={busy !== null}
                        onSubmit={() =>
                          void mutate(
                            "action",
                            () =>
                              apiPost(
                                `/client-portal/operational-reviews/${reviewId}/recommendations/${r.id}/corrective-actions`,
                                {
                                  ...actionForm,
                                  dueDate: actionForm.dueDate || undefined,
                                  clientIntentId: uuid(),
                                },
                              ),
                            "Action corrective créée.",
                          ).then(() => setActionFor(null))
                        }
                      />
                    )}
                    {r.correctiveActions?.map((a: any) => (
                      <ActionCard
                        key={a.id}
                        action={a}
                        open={openAction === a.id}
                        details={actionDetails[a.id]}
                        canEdit={cap.has("CORRECTIVE_ACTION_EDIT")}
                        canComplete={cap.has("CORRECTIVE_ACTION_COMPLETE")}
                        canVerify={cap.has("CORRECTIVE_ACTION_VERIFY")}
                        canClose={cap.has("CORRECTIVE_ACTION_CLOSE")}
                        busy={busy}
                        evidenceForm={evidenceForm}
                        setEvidenceForm={setEvidenceForm}
                        onOpen={() => void loadAction(a.id)}
                        onMutate={mutate}
                        onReloadAction={() => void loadAction(a.id)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <span className={styles.sectionTitle}>CYCLE DU REX</span>
              <h2>
                {review.status === "FINALIZED"
                  ? "REX finalisé"
                  : "Prochaine étape"}
              </h2>
            </div>
          </div>
          {review.status === "DRAFT" && rex.has("REX_REVIEW") && (
            <button
              className={styles.button}
              disabled={busy !== null}
              onClick={() =>
                window.confirm("Soumettre ce REX pour revue ?") &&
                void mutate(
                  "submit",
                  () =>
                    apiPost(
                      `/client-portal/operational-reviews/${reviewId}/submit`,
                      {},
                    ),
                  "REX soumis pour revue.",
                )
              }
            >
              SOUMETTRE POUR REVUE
            </button>
          )}
          {review.status === "IN_REVIEW" && rex.has("REX_FINALIZE") && (
            <button
              className={styles.button}
              disabled={busy !== null}
              onClick={() =>
                window.confirm(
                  "Finaliser le REX ? Ses constats et recommandations deviendront historiques. Les actions correctives resteront suivies séparément.",
                ) &&
                void mutate(
                  "finalize",
                  () =>
                    apiPost(
                      `/client-portal/operational-reviews/${reviewId}/finalize`,
                      {},
                    ),
                  "REX finalisé.",
                )
              }
            >
              FINALISER LE REX
            </button>
          )}
          {review.status === "FINALIZED" && (
            <p className={styles.notice}>
              Le REX est en lecture seule. Les actions correctives poursuivent
              leur cycle indépendamment.
            </p>
          )}
        </section>
      </main>
    </PortalLayout>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`${styles.field} ${full ? styles.fieldFull : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function ActionForm({
  value,
  setValue,
  disabled,
  onSubmit,
}: {
  value: any;
  setValue: (v: any) => void;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className={styles.mutator}>
      <div className={styles.formGrid}>
        <Field label="Titre">
          <input
            value={value.title}
            onChange={(e) => setValue({ ...value, title: e.target.value })}
          />
        </Field>
        <Field label="Priorité">
          <select
            value={value.priority}
            onChange={(e) => setValue({ ...value, priority: e.target.value })}
          >
            <option value="CRITICAL">Critique</option>
            <option value="WARNING">Importante</option>
            <option value="INFO">Information</option>
          </select>
        </Field>
        <Field label="Description" full>
          <textarea
            value={value.description}
            onChange={(e) =>
              setValue({ ...value, description: e.target.value })
            }
          />
        </Field>
        <Field label="Échéance">
          <input
            type="date"
            value={value.dueDate}
            onChange={(e) => setValue({ ...value, dueDate: e.target.value })}
          />
        </Field>
      </div>
      <button
        className={styles.button}
        disabled={disabled || !value.title}
        onClick={onSubmit}
      >
        CRÉER L&apos;ACTION
      </button>
    </div>
  );
}

function ActionCard({
  action: a,
  open,
  details,
  canEdit,
  canComplete,
  canVerify,
  canClose,
  busy,
  evidenceForm,
  setEvidenceForm,
  onOpen,
  onMutate,
  onReloadAction,
}: any) {
  const active =
    details?.evidence?.filter((e: any) => e.status === "ACTIVE") ?? [];
  const mutateThen = (
    key: string,
    work: () => Promise<unknown>,
    message: string,
  ) => onMutate(key, work, message).then(onReloadAction);
  return (
    <article className={styles.action}>
      <div className={styles.actionHead}>
        <div>
          <span className={styles.pill}>
            {a.reference ?? "Action corrective"}
          </span>
          <h4>{a.title}</h4>
        </div>
        <strong>{actionStatusLabel[a.status]}</strong>
      </div>
      <div className={styles.actionMeta}>
        <span>{a.assignedTo || "Responsable non assigné"}</span>
        <span>{a.priority}</span>
        <span>
          {a.dueDate ? `Échéance ${date(a.dueDate)}` : "Sans échéance"}
        </span>
        {isOverdue(a.dueDate, a.status) && <strong>EN RETARD</strong>}
        <span>{a._count?.evidence ?? 0} preuve(s)</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.buttonSecondary} onClick={onOpen}>
          {open ? "ACTUALISER" : "CONSULTER"}
        </button>
        {a.status === "PLANNED" && canComplete && (
          <button
            className={styles.button}
            disabled={busy !== null}
            onClick={() =>
              void mutateThen(
                `start-${a.id}`,
                () =>
                  apiPut(`/client-portal/corrective-actions/${a.id}`, {
                    status: "IN_PROGRESS",
                  }),
                "Action démarrée.",
              )
            }
          >
            DÉMARRER
          </button>
        )}
        {a.status === "IN_PROGRESS" && canComplete && (
          <button
            className={styles.button}
            disabled={busy !== null}
            onClick={() => {
              const comment =
                window.prompt(
                  active.length
                    ? "Commentaire de réalisation (optionnel)"
                    : "Commentaire de réalisation requis",
                ) || "";
              if (!active.length && !comment) return;
              void mutateThen(
                `complete-${a.id}`,
                () =>
                  apiPost(
                    `/client-portal/corrective-actions/${a.id}/complete`,
                    { completionComment: comment || undefined },
                  ),
                "Réalisation déclarée.",
              );
            }}
          >
            DÉCLARER RÉALISÉE
          </button>
        )}
        {a.status === "COMPLETED" && canVerify && (
          <>
            <button
              className={styles.button}
              onClick={() => {
                const comment =
                  window.prompt(
                    active.length
                      ? "Commentaire de vérification (optionnel)"
                      : "Commentaire de vérification requis",
                  ) || "";
                if (!active.length && !comment) return;
                void mutateThen(
                  `verify-${a.id}`,
                  () =>
                    apiPost(
                      `/client-portal/corrective-actions/${a.id}/verify`,
                      {
                        clientIntentId: uuid(),
                        verdict: "ACCEPTED",
                        comment: comment || undefined,
                      },
                    ),
                  "Réalisation vérifiée.",
                );
              }}
            >
              ACCEPTER
            </button>
            <button
              className={styles.buttonDanger}
              onClick={() => {
                const comment =
                  window.prompt("Motif du rejet (obligatoire)") || "";
                if (comment)
                  void mutateThen(
                    `reject-${a.id}`,
                    () =>
                      apiPost(
                        `/client-portal/corrective-actions/${a.id}/verify`,
                        {
                          clientIntentId: uuid(),
                          verdict: "REJECTED",
                          comment,
                        },
                      ),
                    "Réalisation rejetée; l'action est de nouveau en cours.",
                  );
              }}
            >
              REJETER
            </button>
          </>
        )}
        {a.status === "VERIFIED" && canClose && (
          <button
            className={styles.button}
            onClick={() =>
              window.confirm(
                "Fermer cette action ? Elle deviendra historiquement immuable.",
              ) &&
              void mutateThen(
                `close-${a.id}`,
                () =>
                  apiPost(
                    `/client-portal/corrective-actions/${a.id}/close`,
                    {},
                  ),
                "Action fermée.",
              )
            }
          >
            FERMER L&apos;ACTION
          </button>
        )}
      </div>
      {a.status === "COMPLETED" && (
        <p className={styles.notice}>
          <strong>RÉALISATION DÉCLARÉE</strong>
          <br />
          Cette action n&apos;est pas encore vérifiée.
        </p>
      )}
      {a.status === "VERIFIED" && (
        <p className={styles.notice}>
          La réalisation a été vérifiée. L&apos;action peut maintenant être
          fermée.
        </p>
      )}
      {a.status === "CLOSED" && (
        <p className={styles.notice}>
          <strong>FERMÉE</strong> · Lecture seule.
        </p>
      )}
      {open && (
        <div className={styles.evidence}>
          <strong>PREUVES DE RÉALISATION</strong>
          {!active.length && (
            <p className={styles.empty}>Aucune preuve active.</p>
          )}
          {active.map((e: any) => (
            <div className={styles.evidenceRow} key={e.id}>
              <span>
                <strong>{e.title}</strong>
                <br />
                {evidenceTypeLabel[e.type]} · {date(e.submittedAt)}
              </span>
              {canEdit && !["VERIFIED", "CLOSED"].includes(a.status) && (
                <button
                  className={styles.buttonDanger}
                  onClick={() => {
                    const reason =
                      window.prompt(
                        "Motif du retrait. La preuve restera dans l'historique.",
                      ) || "";
                    if (reason)
                      void mutateThen(
                        `withdraw-${e.id}`,
                        () =>
                          apiPost(
                            `/client-portal/corrective-actions/${a.id}/evidence/${e.id}/withdraw`,
                            { withdrawalReason: reason },
                          ),
                        "Preuve retirée.",
                      );
                  }}
                >
                  RETIRER
                </button>
              )}
            </div>
          ))}
          {canEdit && !["VERIFIED", "CLOSED"].includes(a.status) && (
            <div className={styles.mutator}>
              <Field label="Type">
                <select
                  value={evidenceForm.type}
                  onChange={(e) =>
                    setEvidenceForm({ ...evidenceForm, type: e.target.value })
                  }
                >
                  <option value="NOTE">Note</option>
                  <option value="LINK">Lien</option>
                  <option value="DOCUMENT">Document</option>
                  <option value="PHOTO">Photo</option>
                </select>
              </Field>
              <Field label="Titre">
                <input
                  value={evidenceForm.title}
                  onChange={(e) =>
                    setEvidenceForm({ ...evidenceForm, title: e.target.value })
                  }
                />
              </Field>
              {evidenceForm.type === "NOTE" && (
                <Field label="Texte">
                  <textarea
                    value={evidenceForm.text}
                    onChange={(e) =>
                      setEvidenceForm({ ...evidenceForm, text: e.target.value })
                    }
                  />
                </Field>
              )}
              {evidenceForm.type === "LINK" && (
                <Field label="URL HTTPS">
                  <input
                    type="url"
                    value={evidenceForm.url}
                    onChange={(e) =>
                      setEvidenceForm({ ...evidenceForm, url: e.target.value })
                    }
                  />
                </Field>
              )}
              {["DOCUMENT", "PHOTO"].includes(evidenceForm.type) && (
                <Field label="Fichier (10 Mo maximum)">
                  <input
                    id={`file-${a.id}`}
                    type="file"
                    accept={
                      evidenceForm.type === "PHOTO"
                        ? "image/jpeg,image/png,image/webp"
                        : ".pdf,.docx,.xlsx,.txt"
                    }
                  />
                </Field>
              )}
              <button
                className={styles.button}
                disabled={!evidenceForm.title || busy !== null}
                onClick={() => {
                  const intent = uuid();
                  let work: () => Promise<unknown>;
                  if (evidenceForm.type === "NOTE")
                    work = () =>
                      apiPost(
                        `/client-portal/corrective-actions/${a.id}/evidence/note`,
                        {
                          clientIntentId: intent,
                          title: evidenceForm.title,
                          noteText: evidenceForm.text,
                        },
                      );
                  else if (evidenceForm.type === "LINK")
                    work = () =>
                      apiPost(
                        `/client-portal/corrective-actions/${a.id}/evidence/link`,
                        {
                          clientIntentId: intent,
                          title: evidenceForm.title,
                          externalUrl: evidenceForm.url,
                        },
                      );
                  else
                    work = () => {
                      const input = document.getElementById(
                        `file-${a.id}`,
                      ) as HTMLInputElement;
                      const file = input.files?.[0];
                      if (!file) throw new Error("Sélectionnez un fichier.");
                      const form = new FormData();
                      form.append("clientIntentId", intent);
                      form.append("title", evidenceForm.title);
                      form.append("type", evidenceForm.type);
                      form.append("file", file);
                      return apiUpload(
                        `/client-portal/corrective-actions/${a.id}/evidence/file`,
                        form,
                      );
                    };
                  void mutateThen(`evidence-${a.id}`, work, "Preuve ajoutée.");
                }}
              >
                AJOUTER LA PREUVE
              </button>
            </div>
          )}
          <div className={styles.evidence}>
            <strong>HISTORIQUE DES VÉRIFICATIONS</strong>
            {!details?.verifications?.length && (
              <p className={styles.empty}>Aucune tentative.</p>
            )}
            {details?.verifications?.map((v: any) => (
              <p key={v.id}>
                <strong>
                  Tentative {v.attemptNumber} ·{" "}
                  {v.verdict === "ACCEPTED" ? "Acceptée" : "Rejetée"}
                </strong>
                <br />
                {date(v.verifiedAt)}
                {v.comment ? ` · ${v.comment}` : ""}
              </p>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
