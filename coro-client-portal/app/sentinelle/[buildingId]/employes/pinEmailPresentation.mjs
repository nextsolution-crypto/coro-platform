export function pinEmailLabel(status) {
  return (
    {
      ACCEPTED:
        "Courriel PIN accepté par le fournisseur; livraison à confirmer.",
      DELIVERED: "Courriel PIN livré selon le fournisseur.",
      REJECTED: "Courriel PIN refusé; contactez un administrateur.",
      FAILED:
        "Échec de livraison du courriel PIN; contactez un administrateur.",
      OUTCOME_UNKNOWN:
        "Envoi du PIN incertain. Ne pas recréer l’employé ni relancer sans vérification.",
      SIMULATED: "Courriel PIN simulé; aucun courriel réel envoyé.",
      BLOCKED: "Courriel PIN bloqué par la politique de communication.",
      NOT_REQUESTED: "Aucun envoi de PIN demandé.",
    }[status] || "Envoi du PIN non vérifié."
  );
}
