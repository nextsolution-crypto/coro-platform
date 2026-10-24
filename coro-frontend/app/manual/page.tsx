"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import styles from "./manual.module.css";

type Article = {
  id: string;
  title: string;
  category: string;
  summary: string;
  prerequisites: string[];
  steps: string[];
  expectedResult: string;
  limits: string[];
  route: string;
  href: string;
  version: string;
  sha256: string;
};
type Answer = { status: string; explanation: string; articles: Article[] };

export default function ManualPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [version, setVersion] = useState("");
  const [filter, setFilter] = useState("");
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [loading, setLoading] = useState(true);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api
      .get("/user-manual")
      .then((r) => r.data as { articles: Article[]; version: string })
      .then((data) => {
        if (alive) {
          setArticles(data.articles);
          setVersion(data.version);
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "Le manuel est indisponible. Réessayez après avoir vérifié votre connexion.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function ask(event: FormEvent) {
    event.preventDefault();
    if (asking) return;
    setAsking(true);
    setError("");
    setAnswer(null);
    try {
      setAnswer(
        await api
          .post("/user-manual/ask", { question })
          .then((r) => r.data as Answer),
      );
    } catch {
      setError(
        "L’aide est indisponible. Vous pouvez consulter les articles ci-dessous.",
      );
    } finally {
      setAsking(false);
    }
  }
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const visible = articles.filter(
    (a) =>
      (!category || a.category === category) &&
      normalize([a.title, a.summary, ...a.steps].join(" ")).includes(
        normalize(filter),
      ),
  );
  function renderArticle(a: Article, compact = false) {
    return (
      <article
        key={a.id}
        id={compact ? undefined : a.id}
        className={styles.card}
      >
        <p className={styles.category}>{a.category}</p>
        <h3>{a.title}</h3>
        <p>{a.summary}</p>
        <details open={compact}>
          <summary>Voir les étapes et les conditions</summary>
          <h4>Avant de commencer</h4>
          <ul>
            {a.prerequisites.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <h4>Étapes</h4>
          <ol>
            {a.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
          <h4>Résultat attendu</h4>
          <p>{a.expectedResult}</p>
          <h4>À savoir</h4>
          <ul>
            {a.limits.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <Link href={a.route}>Ouvrir l’espace concerné</Link>
          <p className={styles.meta}>
            Manuel {a.version} · article {a.id} · SHA-256{" "}
            {a.sha256.slice(0, 12)}…
          </p>
        </details>
      </article>
    );
  }
  return (
    <AppLayout>
      <main className={styles.page}>
        <header>
          <p className={styles.category}>Centre d’aide CORO</p>
          <h1>Manuel d’utilisation</h1>
          <p>
            Retrouvez une fonction, ses étapes et le résultat attendu. Les
            actions disponibles dépendent de votre rôle et des capacités
            activées.
          </p>
        </header>
        <section className={styles.panel} aria-labelledby="manual-ai">
          <h2 id="manual-ai">Aide CORO AI — utiliser l’application</h2>
          <p>
            Cette aide recherche les instructions du manuel et les restitue avec
            leur référence, sans génération libre. Elle ne consulte aucun
            document client et ne déclenche aucune action.
          </p>
          <form onSubmit={ask}>
            <label htmlFor="manual-question">
              Comment puis-je vous aider ?
            </label>
            <div className={styles.row}>
              <input
                id="manual-question"
                value={question}
                maxLength={1000}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ex. Comment approuver un document ?"
                minLength={3}
                required
              />
              <button
                disabled={asking || loading || question.trim().length < 3}
              >
                {asking ? "Recherche…" : "Trouver les étapes"}
              </button>
            </div>
          </form>
          <div role="status" aria-live="polite">
            {answer && <p>{answer.explanation}</p>}
          </div>
          {answer?.articles.map((a) => renderArticle(a, true))}
        </section>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <section aria-labelledby="manual-articles">
          <h2 id="manual-articles">Parcourir le manuel</h2>
          <div className={styles.filters}>
            <label>
              Rechercher dans les articles
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                type="search"
              />
            </label>
            <label>
              Catégorie
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {Array.from(new Set(articles.map((a) => a.category))).map(
                  (c) => (
                    <option key={c}>{c}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          {loading ? (
            <p role="status">Chargement du manuel…</p>
          ) : (
            <>
              <p>
                {visible.length} article(s) · version {version}
              </p>
              {!visible.length && (
                <p>Aucun article ne correspond à ces filtres.</p>
              )}
              <div className={styles.grid}>
                {visible.map((a) => renderArticle(a))}
              </div>
            </>
          )}
        </section>
        <footer>
          Ce manuel décrit l’utilisation de CORO. Les plans et procédures
          approuvés du site restent les références opérationnelles. Une fonction
          absente du manuel n’est pas nécessairement indisponible : contactez
          votre administrateur.
        </footer>
      </main>
    </AppLayout>
  );
}
