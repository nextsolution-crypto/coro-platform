# Gate 1B — contrôle obligatoire post-migration

Ce gate n'est pas exécutable sur le schéma actuellement déployé. Il demeure obligatoire après une future application gouvernée des migrations Display et avant toute création d'emplacement, publication ou activation d'appareil.

Il devra vérifier dans le tenant et le bâtiment canoniques : permissions Display effectives, autorités professionnelles, étage/zone/emplacement, associations composites, publication approuvée, session et révocation, profil strict `WEB_VIEW_ONLY`, absence d'autorité d'urgence, et refus hors périmètre.

**Statut : REQUIRED_POST_MIGRATION — non exécuté, sans contournement.**
