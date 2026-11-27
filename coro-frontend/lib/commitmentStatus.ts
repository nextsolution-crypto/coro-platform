// Libellés lisibles des statuts d'engagement (BookingCommitmentStatus).
const LABELS: Record<string, string> = {
  PROPOSED: "Affectation proposée — en attente de votre réponse",
  CONFIRMED: "Affectation confirmée",
  DECLINED: "Affectation refusée",
  SUPERSEDED: "Remplacée par une version plus récente",
  CANCELLED: "Affectation annulée",
};

export function commitmentStatusLabel(status?: string | null): string {
  return (status && LABELS[status]) || "Affectation";
}
