"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, RefreshCw } from "lucide-react";
import PortalLayout from "../../../../../components/PortalLayout";
import {
  apiGet,
  apiPost,
  apiPut,
  getUser,
} from "../../../../../store/auth";
import {
  actionStatusLabel,
  confidentialityLabel,
  findingCategoryLabel,
  recommendationStatusLabel,
  reviewStatusLabel,
  severityLabel,
} from "../reviewState";
import styles from "./review.module.css";

const uuid = () => crypto.randomUUID();
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
      const failure = caught instanceof Error
        ? caught.message
        : "L'opération n'a pas pu être terminée.";
      try { await load(true); } catch { /* Conserver l'erreur métier initiale. */ }
      setError(failure);
    } finally {
      setBusy(null);
    }
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
                      <article className={styles.action} key={a.id}>
                        <div className={styles.actionHead}>
                          <div><span className={styles.pill}>{a.reference ?? "Action corrective"}</span><h4>{a.title}</h4></div>
                          <strong>{actionStatusLabel[a.status] ?? a.status}</strong>
                        </div>
                        <p>{a.description}</p>
                        <button className={styles.buttonSecondary} type="button" onClick={() => router.push(`/sentinelle/${buildingId}/corrective-actions/${a.id}`)}>CONSULTER L&apos;ACTION</button>
                      </article>
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
