export function pinEmailLabel(status) {
  return (
    {
      ACCEPTED:
        "Courriel PIN accepté par le fournisseur; livraison à confirmer.",
      DELIVERED: "Courriel PIN livré selon le fournisseur.",
      REJECTED: "Courriel PIN refusé; un renvoi peut être demandé.",
      FAILED:
        "Échec de livraison du courriel PIN; un renvoi peut être demandé.",
      OUTCOME_UNKNOWN:
        "Envoi du PIN incertain. Ne pas recréer l’employé ni relancer sans vérification.",
      SIMULATED: "Courriel PIN simulé; aucun courriel réel envoyé.",
      BLOCKED: "Courriel PIN bloqué par la politique de communication.",
      NOT_REQUESTED: "Aucun envoi de PIN demandé.",
    }[status] || "Livraison du courriel PIN non confirmée pour cette fiche."
  );
}

export function pinEmailResendDisabled(employee) {
  return !employee.email || !String(employee.email).trim() || employee.pinEmailStatus === 'OUTCOME_UNKNOWN';
}
