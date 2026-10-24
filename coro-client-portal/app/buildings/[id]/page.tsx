"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import PortalLayout from "../../components/PortalLayout";
import BuildingDocuments from "../../components/building-documents/BuildingDocuments";
export default function BuildingDocumentsPage() {
  const params = useParams();
  return (
    <PortalLayout>
      <Link href="/buildings">← Mes bâtiments</Link>
      <BuildingDocuments buildingId={String(params.id)} />
    </PortalLayout>
  );
}
