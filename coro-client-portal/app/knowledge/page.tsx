"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CircleAlert, Search, Send, ShieldCheck } from "lucide-react";
import PortalLayout from "../components/PortalLayout";
import { apiGet, apiPost } from "../store/auth";
import styles from "./knowledge.module.css";

type Citation = {
  citationId: string;
  projectFileId: string;
  version: number;
  name: string;
  pageStart: number;
  pageEnd: number;
  sectionPath: string | null;
  sha256: string;
  href: string;
};

type Answer = {
  status: "ANSWERED" | "INSUFFICIENT_EVIDENCE" | "BLOCKED" | "PROVIDER_FAILURE";
  provider: "DETERMINISTIC_SIMULATED";
  answer: string | null;
  uncertainty: string | null;
  missingInformation: string[];
  conflicts: string[];
  citations: Citation[];
  correlationId: string;
};

type SearchHit = {
  citationId: string;
  projectFileId: string;
  projectFileVersion: number;
  documentName: string;
  pageStart: number;
  pageEnd: number;
  sectionPath: string | null;
  text: string;
  score: number;
};

export default function KnowledgePage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(event: FormEvent) {
    event.preventDefault();
    const value = question.trim();
    if (value.length < 3) return;
    setLoading(true);
    setError("");
    try {
      const [response, search] = await Promise.all([
        apiPost("/client-portal/knowledge/ask", { question: value }),
        apiGet(`/client-portal/knowledge/search?q=${encodeURIComponent(value)}`),
      ]);
      setAnswer(response as Answer);
      setResults((search as SearchHit[]) ?? []);
    } catch (caught) {
      setAnswer(null);
      setResults([]);
      setError(caught instanceof Error ? caught.message : "La recherche est indisponible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PortalLayout>
      <main className={styles.page}>
        <header className={styles.hero}>
          <div className={styles.heroIcon} aria-hidden="true"><BookOpenCheck /></div>
          <div>
            <p className={styles.eyebrow}>CORO Knowledge</p>
            <h1>Interroger vos documents approuvés</h1>
            <p>
              Les réponses proviennent uniquement des versions ProjectFile actuelles auxquelles vous avez accès.
            </p>
          </div>
          <span className={styles.provider}><ShieldCheck size={16} /> IA simulée locale</span>
        </header>

        <section className={styles.askPanel} aria-labelledby="knowledge-question">
          <form onSubmit={ask} className={styles.form}>
            <label id="knowledge-question" htmlFor="knowledge-input">Votre question contextuelle</label>
            <div className={styles.inputRow}>
              <textarea
                id="knowledge-input"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ex. Où se trouve la vanne principale selon le plan approuvé?"
                maxLength={2000}
                rows={3}
              />
              <button type="submit" disabled={loading || question.trim().length < 3}>
                {loading ? <span className={styles.spinner} aria-hidden="true" /> : <Send size={18} />}
                {loading ? "Analyse…" : "Interroger"}
              </button>
            </div>
            <p className={styles.helper}>Aucune action opérationnelle ne peut être déclenchée depuis cet assistant.</p>
          </form>
        </section>

        {error && <div className={styles.error} role="alert"><CircleAlert size={18} />{error}</div>}

        {answer && (
          <section className={styles.answerGrid} aria-live="polite">
            <article className={styles.answerCard}>
              <div className={styles.cardHeader}><h2>Réponse fondée sur les sources</h2><span>{answer.status}</span></div>
              {answer.answer ? <p className={styles.answer}>{answer.answer}</p> : <div className={styles.empty}><CircleAlert /><p>{answer.uncertainty ?? "Information insuffisante."}</p></div>}
              {answer.uncertainty && answer.answer && <p className={styles.uncertainty}>{answer.uncertainty}</p>}
              {answer.conflicts.length > 0 && <div className={styles.warning}><strong>Contradiction détectée</strong>{answer.conflicts.map((item) => <p key={item}>{item}</p>)}</div>}
              <small>Référence de requête : {answer.correlationId}</small>
            </article>

            <aside className={styles.citations} aria-label="Sources canoniques">
              <h2>Sources canoniques</h2>
              {answer.citations.length ? answer.citations.map((citation) => (
                <Link key={citation.citationId} href={citation.href} className={styles.citation}>
                  <FileCitation citation={citation} />
                </Link>
              )) : <p className={styles.noCitation}>Aucune citation présentable.</p>}
            </aside>
          </section>
        )}

        {results.length > 0 && (
          <section className={styles.results}>
            <div className={styles.sectionTitle}><Search size={20} /><h2>Extraits autorisés associés</h2></div>
            <div className={styles.resultList}>
              {results.map((result) => (
                <article key={result.citationId} className={styles.resultCard}>
                  <div><strong>{result.documentName}</strong><span>Version {result.projectFileVersion} · page {result.pageStart}{result.pageEnd !== result.pageStart ? `–${result.pageEnd}` : ""}</span></div>
                  <p>{result.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </PortalLayout>
  );
}

function FileCitation({ citation }: { citation: Citation }) {
  return <><div><strong>{citation.name}</strong><span>Version {citation.version}</span></div><p>Page {citation.pageStart}{citation.pageEnd !== citation.pageStart ? `–${citation.pageEnd}` : ""}{citation.sectionPath ? ` · section ${citation.sectionPath}` : ""}</p><small>SHA-256 {citation.sha256.slice(0, 12)}…</small></>;
}
