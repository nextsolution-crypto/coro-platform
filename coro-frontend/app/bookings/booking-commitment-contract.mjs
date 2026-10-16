export const MISSING_COMMITMENT_MESSAGE =
  "Les conditions de cette affectation ne peuvent pas être vérifiées. Actualisez la réservation avant de répondre.";

export const STALE_COMMITMENT_MESSAGE =
  "Cette réservation a été modifiée depuis son affichage. Actualisez les informations et vérifiez les nouvelles conditions avant de répondre.";

export function getCommitmentEvidence(assignment, booking) {
  if (!assignment?.governedCommitment) {
    return { kind: "legacy", commitment: null };
  }

  const commitment = assignment.commitmentVersion;
  if (
    !commitment?.id ||
    !commitment?.expectedFingerprint ||
    commitment.status !== "PROPOSED" ||
    (booking &&
      (commitment.advisorId !== assignment.userId ||
        commitment.projectId !== booking.projectId ||
        commitment.buildingId !==
          (booking.project?.buildingId ?? booking.siteId) ||
        (commitment.activityId ?? null) !== (booking.activityId ?? null)))
  ) {
    return { kind: "missing", commitment: null };
  }

  return { kind: "governed", commitment };
}

export function buildAdvisorResponsePayload(assignment, status, booking) {
  const evidence = getCommitmentEvidence(assignment, booking);
  if (evidence.kind === "missing") {
    const error = new Error(MISSING_COMMITMENT_MESSAGE);
    error.code = "MISSING_COMMITMENT_EVIDENCE";
    throw error;
  }
  if (evidence.kind === "legacy") return { status };

  return {
    status,
    commitmentVersionId: evidence.commitment.id,
    expectedFingerprint: evidence.commitment.expectedFingerprint,
  };
}

export function isStaleCommitmentError(message) {
  return /engagement.*(?:périmé|remplacé)|version et empreinte d’engagement requises|proposition d’engagement n’est plus courante|affectation ne peut plus recevoir de réponse/i.test(
    message || "",
  );
}
