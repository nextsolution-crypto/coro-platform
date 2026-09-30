"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AppLayout from "@/components/layout/AppLayout";
import api from "@/lib/api";
import {
  CommercialRelationshipBadge,
  OrganizationStatusBadge,
} from "@/components/admin/control-center/ControlCenterComponents";
type OrganizationRow = {
  id: string;
  name: string;
  isActive: boolean;
  commercialRelationship?: string | null;
};
type OrganizationIndexResponse = { items: OrganizationRow[] };
export default function CommercialOrganizationIndex({
  title,
  description,
  tab,
}: {
  title: string;
  description: string;
  tab: string;
}) {
  const [data, setData] = useState<OrganizationIndexResponse>();
  useEffect(() => {
    api
      .get("/admin/v1/control-center/organizations?pageSize=100")
      .then((r) => setData(r.data));
  }, []);
  return (
    <AppLayout>
      <div className="mx-auto max-w-6xl p-6">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-slate-600">
          {description} Read-only index; no mutation UX.
        </p>
        <div className="mt-6 rounded-xl border bg-white">
          {data?.items?.map((o) => (
            <Link
              className="flex items-center gap-3 border-b p-4 last:border-0"
              href={`/admin/organizations/${o.id}?tab=${tab}`}
              key={o.id}
            >
              <span className="flex-1 font-medium">{o.name}</span>
              <OrganizationStatusBadge active={o.isActive} />
              <CommercialRelationshipBadge value={o.commercialRelationship} />
            </Link>
          ))}
          {!data && <p className="p-4">Loading…</p>}
        </div>
      </div>
    </AppLayout>
  );
}
