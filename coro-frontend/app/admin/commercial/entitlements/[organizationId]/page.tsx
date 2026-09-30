"use client";
import { useParams, useSearchParams } from "next/navigation";
import CapabilityOperationsWorkspace from "@/components/admin/capability-operations/CapabilityOperationsWorkspace";
export default function CapabilityOperationsPage() {
  const params = useParams<{ organizationId: string }>();
  const search = useSearchParams();
  return (
    <CapabilityOperationsWorkspace
      organizationId={params.organizationId}
      initialCapability={search.get("capability") ?? undefined}
    />
  );
}
