"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import FinancialPanel, { type FinancialResponse } from "@/components/rendement/FinancialPanel";
import OccupationPanel, { type OperationalAdvisor } from "@/components/rendement/OccupationPanel";

// Repères conservés pour le contrat : formatFinancialAmount, financialCurrencyLabel,
// « Mandats incomplets » et « main-d’œuvre connue » sont rendus par FinancialPanel.

const civilDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export default function RendementPage() {
  const router = useRouter();
  const { user, isInitialized, initAuth } = useAuthStore();
  const now = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(civilDate(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(civilDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
  const [data, setData] = useState<FinancialResponse | null>(null);
  const [advisors, setAdvisors] = useState<OperationalAdvisor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      router.replace("/profile/rendement");
      return;
    }
    let active = true;
    api
      .get<FinancialResponse>("/rendement/financial", { params: { view: "cumulative" } })
      .then((response) => {
        if (active) {
          setData(response.data);
          setError("");
        }
      })
      .catch(() => active && setError("Les indicateurs financiers ne peuvent pas être chargés."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [isInitialized, router, user]);

  useEffect(() => {
    if (!isInitialized || !user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) return;
    let active = true;
    api
      .get<{ advisors: OperationalAdvisor[] }>("/rendement/operational", { params: { from, to } })
      .then((response) => active && setAdvisors(response.data.advisors))
      .catch(() => active && setAdvisors([]));
    return () => {
      active = false;
    };
  }, [from, isInitialized, to, user]);

  return (
    <AppLayout>
      <header className="mb-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-500">Direction</p>
        <h1 className="text-2xl font-black text-slate-800">Rendement et rentabilité de l’équipe</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Occupation de chaque conseiller sur la période choisie, et rentabilité cumulative de chaque
          mandat. Les coûts couvrent uniquement la main-d’œuvre connue; un mandat incomplet ne produit
          pas de marge présentée comme certaine.
        </p>
      </header>

      <section
        aria-label="Période d’occupation"
        className="mb-6 grid gap-4 rounded-md border border-slate-200 bg-white p-4 sm:grid-cols-2"
      >
        <label className="text-sm font-semibold text-slate-700">
          Du
          <input className="mt-1 block w-full rounded border border-slate-300 p-2" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="text-sm font-semibold text-slate-700">
          Au
          <input className="mt-1 block w-full rounded border border-slate-300 p-2" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
      </section>

      {advisors && <OccupationPanel advisors={advisors} from={from} to={to} />}

      {loading && <p role="status">Chargement des indicateurs…</p>}
      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {!loading && !error && data && <FinancialPanel data={data} />}
    </AppLayout>
  );
}
