"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

type OperationalResponse = {
  period: { from: string | null; to: string | null; timeZone: string };
  advisors: Array<{
    userId: string;
    userName: string;
    hours: number;
    activities: Array<{ id: string; label: string }>;
    participatedMandates: Array<{
      mandateId: string | null;
      projectId: string;
      projectName: string;
    }>;
  }>;
};

const civilDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function MonRendementPage() {
  const router = useRouter();
  const { user, isInitialized, initAuth } = useAuthStore();
  const now = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(
    civilDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  );
  const [to, setTo] = useState(
    civilDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  );
  const [data, setData] = useState<OperationalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isInitialized || !user) return;
    let active = true;
    api
      .get<OperationalResponse>("/rendement/operational", {
        params: { from, to },
      })
      .then((response) => {
        if (active) {
          setData(response.data);
          setError("");
        }
      })
      .catch(
        () =>
          active &&
          setError("Votre rendement opérationnel ne peut pas être chargé."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [from, isInitialized, to, user]);

  const advisor =
    data?.advisors.find((item) => item.userId === user?.id) ??
    data?.advisors[0];

  return (
    <AppLayout>
      <header className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">
          Mon profil
        </p>
        <h1 className="text-2xl font-black text-slate-800">
          Mon rendement opérationnel
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Heures, activités et participations autorisées. Aucune donnée
          financière n’est affichée.
        </p>
      </header>

      <section
        aria-label="Période"
        className="mb-6 grid gap-4 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-2"
      >
        <label className="text-sm font-semibold text-slate-700">
          Du
          <input
            className="mt-1 block w-full rounded border border-slate-300 p-2"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Au
          <input
            className="mt-1 block w-full rounded border border-slate-300 p-2"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </section>

      {loading && <p role="status">Chargement du rendement…</p>}
      {error && (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-red-800"
        >
          {error}
        </p>
      )}
      {!loading && !error && !advisor && (
        <p className="rounded border border-slate-200 bg-white p-8 text-center text-slate-500">
          Aucune heure saisie pour cette période.
        </p>
      )}

      {!loading && !error && advisor && (
        <>
          <section
            aria-label="Synthèse opérationnelle"
            className="mb-6 grid gap-4 sm:grid-cols-3"
          >
            <article className="rounded-md border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Heures saisies</p>
              <p className="text-2xl font-black text-blue-700">
                {advisor.hours.toFixed(1)} h
              </p>
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">Activités</p>
              <p className="text-2xl font-black text-slate-800">
                {advisor.activities.length}
              </p>
            </article>
            <article className="rounded-md border border-slate-200 bg-white p-5">
              <p className="text-sm text-slate-500">
                Mandats avec participation
              </p>
              <p className="text-2xl font-black text-slate-800">
                {advisor.participatedMandates.length}
              </p>
            </article>
          </section>

          <section
            aria-labelledby="participations-heading"
            className="rounded-md border border-slate-200 bg-white"
          >
            <h2
              id="participations-heading"
              className="border-b border-slate-200 px-5 py-4 font-bold"
            >
              Participations opérationnelles
            </h2>
            {advisor.participatedMandates.length === 0 ? (
              <p className="p-6 text-slate-500">
                Aucune participation pendant cette période.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {advisor.participatedMandates.map((mandate) => (
                  <li
                    key={`${mandate.projectId}:${mandate.mandateId ?? "none"}`}
                  >
                    <button
                      className="w-full px-5 py-4 text-left font-semibold text-red-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2"
                      onClick={() =>
                        router.push(`/projects/${mandate.projectId}/mandate`)
                      }
                    >
                      {mandate.projectName}
                      <span className="ml-2" aria-hidden="true">
                        →
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppLayout>
  );
}
