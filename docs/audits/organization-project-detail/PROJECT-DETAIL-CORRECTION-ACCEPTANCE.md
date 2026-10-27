# Clôture du lot de correction — fiche projet organisation

Date de recette locale : 2026-10-26 (America/Toronto)

## Portée livrée

- rattachements client/bâtiment validés côté serveur à partir de l'organisation canonique ;
- refus des champs d'autorité et des relations imbriquées fournis par le navigateur ;
- lecture directe des projets désactivés refusée comme dans la liste ;
- calcul de qualité soumis à la même portée canonique que la fiche projet ;
- contrôle optimiste par `expectedUpdatedAt`, transaction PostgreSQL sérialisable et conflit HTTP 409 ;
- distinction UI entre absence, refus, session et indisponibilité, avec reprise explicite ;
- protection contre les réponses tardives et affichage non périmé ;
- en-tête, commandes, métadonnées et étapes adaptés aux petits écrans.

Aucune migration n'est requise. Le contrôle de concurrence réutilise `Project.updatedAt`.

## Preuves QA

- stack isolé `projdetail-fix`, PostgreSQL 16, 155 migrations, backend et frontend réels ;
- fournisseurs locaux et réseau deny-by-default ;
- acteurs et données synthétiques multi-organisations ;
- tests de sécurité ciblés : 32/32 PASS ;
- harnais global : 28/28 PASS ;
- recette API/navigateur : 22/22 PASS ;
- matrice responsive : 12/12 PASS, aux formats 390, 768, 1440 et 2560, dans Classic, Glass Light et Glass Dark ;
- captures et résultat structuré : `D:\CORO-QA\audits\organization-project-detail\2026-10-26-final2` ;
- build backend : PASS ;
- build frontend et TypeScript : PASS ;
- suite backend étendue : 2183 PASS, 2 ignorés, 1 test OCR hors périmètre non exécutable localement faute de `pdftoppm` sur l'hôte Windows. L'image backend vérifie son runtime PDF/OCR pendant le build.

## Résolution des constats

| Constat | Résultat QA |
|---|---|
| PROJ-DETAIL-001 — substitution client/bâtiment | CORRIGÉ, refus inter-organisation sans mutation |
| PROJ-DETAIL-002 — qualité hors affectation | CORRIGÉ, 404 selon la portée canonique |
| PROJ-DETAIL-003 — lecture directe désactivée | CORRIGÉ, 404 et cohérence liste/direct |
| PROJ-DETAIL-004 — géométrie mobile | CORRIGÉ, 12/12 |
| PROJ-DETAIL-005 — panne présentée en 404 | CORRIGÉ, état indisponible et bouton Réessayer |
| PROJ-DETAIL-006 — écrasement concurrent | CORRIGÉ, seconde écriture obsolète en 409 |
| PROJ-DETAIL-009 — zones secondaires silencieuses | CORRIGÉ, avertissement et reprise par zone |

Les décisions produit non liées à ces défauts (dates métier, échéance, parcours documentaires profonds) restent hors de ce lot.

## Publication et production

- PR produit : `#101`, fusionnée dans `main` au SHA `87c5de5f40833c4384df5eda9fdc3739689678f0` ;
- CI de fusion : `40431442904`, SUCCESS ;
- première tentative de release : `40431775136`, arrêt fail-closed avant mutation (`RELEASE_CAPACITY_INSUFFICIENT`) ;
- inspection après arrêt : `40432745757`, PASS/GO, production demeurée au SHA antérieur `2ff9db7b0858a12dd0119e8109efc02ffc392522`, migration 155 et quatre services sains ;
- audit de capacité : `40432936727`, sauvegarde prête mais marge release de `-2598626150` octets ;
- dry-run ciblé : `40433065615`, 40 images de cache non référencées admissibles, sans image active ou rollback ;
- maintenance gouvernée : `40433168637`, 40/40 images listées retirées, espace libre passé de `17102553088` à `40521265152` octets ;
- aucun volume, sauvegarde, manifeste, preuve ou image protégée n'a été supprimé.

Le premier identifiant de release est terminal (`FAILED`) par conception. Le présent commit documentaire constitue un successeur traçable sans modification produit ; la vérification en production reste ouverte jusqu'à la release gouvernée de ce successeur et son inspection post-release.
