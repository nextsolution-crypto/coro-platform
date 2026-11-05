# SP-OPS-02 — Préparation de livraison

## Contenu du candidat

- migration additive de ciblage institutionnel;
- DTO, service et tests Population;
- sélection humaine dans le portail;
- correction du namespace privé des nouveaux rapports;
- harnais intégré et navigateur;
- six rapports SP-OPS-02.

## État des gates

| Gate | Statut |
|---|---|
| Diff ciblé et schéma Prisma sans reformatage global | PASS |
| Migration zéro et upgrade peuplé | PASS |
| Tests Population et rapport | PASS |
| Build backend/portail | PASS |
| Recette PostgreSQL/API | PASS |
| Chrome 12/12 applicable | PASS |
| Diff check | PASS |
| Suite globale | PARTIAL — dépendance locale `pdftoppm` absente, hors périmètre Population |
| Fournisseurs réels | NON INVOQUÉS |
| Diffusion LIVE | DÉSACTIVÉE / NO-GO |

## Conditions avant fusion ou déploiement

1. revue du diff et CI terminale du HEAD publié;
2. validation de la migration par la CI;
3. maintien des restrictions LIVE et des variables fournisseur;
4. aucun secret ou destinataire réel dans le candidat;
5. gates gouvernés ordinaires de capacité, sauvegarde, restauration et rollback;
6. inspection post-release si une autorisation distincte est ensuite donnée.

## Verdict

**GO AVEC RÉSERVES POUR PR ET REVUE.**

**AUCUNE AUTORISATION DE FUSION OU DE DÉPLOIEMENT.**

**NO-GO POUR DIFFUSION RÉELLE.**
