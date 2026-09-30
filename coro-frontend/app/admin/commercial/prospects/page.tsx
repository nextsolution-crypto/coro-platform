"use client";
import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
type Prospect = {
  id: string;
  displayName?: string;
  legalName: string;
  status: string;
};
export default function ProspectsPage() {
  const [items, setItems] = useState<Prospect[]>([]);
  useEffect(() => {
    api
      .get("/admin/v1/commercial/prospects")
      .then((r) =>
        setItems(Array.isArray(r.data) ? r.data : (r.data?.items ?? [])),
      );
  }, []);
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-3xl font-semibold">Prospects</h1>
        <p className="text-sm text-slate-600">
          Read-only index. Conversion remains in the specialized commercial
          workflow.
        </p>
        <div className="mt-6 rounded-xl border bg-white">
          {items.map((x) => (
            <div className="border-b p-4 last:border-0" key={x.id}>
              <b>{x.displayName ?? x.legalName}</b>
              <span className="ml-3 text-sm text-slate-500">{x.status}</span>
            </div>
          ))}
          {!items.length && <p className="p-4 text-slate-500">No prospects.</p>}
        </div>
      </div>
    </AppLayout>
  );
}
