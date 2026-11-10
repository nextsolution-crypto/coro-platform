# Frontend

`ObservationManager` est rendu dans `/display` sous l’`AppLayout` existant. Il fournit tableau de bord, recherche, filtres, priorités, liste, détail, qualification, assignation, messages, transitions, preuve et historique.

Corrections consolidées : catégories Prisma canoniques, priorité de filtre séparée de la qualification, transitions filtrées par capacités, formulaire de référence/preuve, champs accessibles, et blocage client d’une résolution sans preuve. Le libellé parle d’un « constat ou preuve contrôlé par le validateur » et non d’une preuve automatiquement certifiée.

Liquid Glass est régénéré avec l’outil officiel et synchronisé entre application et portail. Les contrats de navigation et le build Next passent. Une alerte ESLint préexistante `no-img-element` demeure sur la page Display; elle n’est pas introduite par DISPLAY-05C.

Limite : rendu navigateur réel non vérifié.
