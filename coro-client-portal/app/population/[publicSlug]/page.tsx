"use client";

import { useParams } from "next/navigation";
import PopulationPublicShell from "../components/PopulationPublicShell";

export default function PublicPopulationPage() {
  const { publicSlug } = useParams<{ publicSlug: string }>();
  return <PopulationPublicShell publicSlug={publicSlug} />;
}
