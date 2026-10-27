# Matrice d'acceptation — fiche projet organisation

Statuts : **PASS**, **FAIL**, **NOT_VERIFIED**, **NON_APPLICABLE**, **DÉCISION_PRODUIT_REQUISE**.

| Domaine | Scénario | Statut | Preuve / limite |
|---|---|---:|---|
| Baseline | source, origin/main et déploiement | PASS | SHA `2ff9db7b...`; deployments GitHub production + inspection |
| QA | PostgreSQL/backend/frontend/MFA/réseau isolé | PASS | stack `projdetail-audit`, 155 migrations, manifest D: |
| Navigation | liste → bon projet | PASS | lien natif et URL exacte |
| Navigation | accès direct + F5 | PASS | session MFA synthétique conservée |
| Navigation | retour navigateur vers liste | PASS | `/projects` |
| Navigation | liens client et bâtiment | FAIL | valeurs en texte, aucune navigation directe |
| Identité | nom, type, statut | PASS | en-tête visible et distinct |
| Contexte | client, bâtiment, année | PASS | valeurs synthétiques exactes |
| Contexte | adresse et responsable | PASS | carte d'information exacte |
| Dates | création, modification, échéance | DÉCISION_PRODUIT_REQUISE | non affichées; pas d'échéance Project |
| Affectation | responsable unique | PASS | relation `Project.user` rendue |
| Affectation | plusieurs responsables | NON_APPLICABLE | modèle principal mono-responsable |
| Progression | valeur connue 0 % | PASS limité | valeur persistée affichée; définition par seuils documentée |
| Progression | zéro vs non calculable vs panne | FAIL | aucune distinction |
| Qualité | calcul avec données connues | NOT_VERIFIED | fixture sans document; calcul inspecté mais pas étalonné E2E |
| Qualité | autorisation OPERATOR non affecté | FAIL | HTTP 200 malgré fiche HTTP 404 |
| Qualité | panne secondaire explicite | FAIL / preuve code | zone absente, erreurs absorbées |
| Permissions | OPERATOR affecté | PASS | fiche HTTP 200 |
| Permissions | OPERATOR non affecté | PASS pour fiche | HTTP 404 |
| Permissions | autre organisation | PASS | OPERATOR/ADMIN B HTTP 404 |
| Permissions | utilisateur désactivé | PASS fondation | authentification refusée; détail non atteint |
| Permissions | organisation fournie dans PUT | PASS | HTTP 403 |
| Permissions | responsable fourni dans PUT | PASS | HTTP 403 |
| Permissions | client/bâtiment autre organisation | FAIL | HTTP 200 et relations modifiées, puis restaurées |
| Désactivation | absent de la liste | PASS | fixture `isActive=false` non listée |
| Désactivation | URL directe | FAIL | HTTP 200 |
| Archive | consultation directe | PASS | HTTP 200, statut ARCHIVED |
| Archive | boutons de mutation absents | PASS | archive/suppression absents |
| Archive | PUT direct refusé | PASS | HTTP 403 |
| Archive | versions/fichiers conservés | NOT_VERIFIED en profondeur | sections hors périmètre; version fixture existe |
| Actions | archivage | PASS serveur limité | refus sur archive; succès actif non rejoué pour préserver les campagnes précédentes |
| Actions | désactivation | PASS serveur limité | politique existante inspectée; modal incohérente |
| Actions | modification générale UI | NON_APPLICABLE | aucune interface sur l'écran |
| Actions | échéance / affectation / duplication UI | NON_APPLICABLE | absentes de l'écran |
| Concurrence | deux écritures obsolètes | FAIL | deux HTTP 200, dernière écriture gagnante |
| Résilience | chargement initial | PASS | état Chargement visible |
| Résilience | projet inexistant distinct | NOT_VERIFIED | même rendu statique attendu que panne |
| Résilience | panne principale 503 | FAIL | faux « Projet introuvable », aucun retry |
| Résilience | panne secondaire | FAIL / preuve code | `catch` silencieux; simulation navigateur non complète |
| Résilience | session expirée | NOT_VERIFIED | aucune campagne dédiée |
| Résilience | réponse lente | NOT_VERIFIED | aucune temporisation contrôlée finale |
| Résilience | réponse tardive ancien projet | NOT_VERIFIED / risque code | effet ne dépend pas de `projectId`, aucune annulation |
| Responsive | 390 × 844, 3 thèmes | FAIL 0/3 | actions et étapes coupées |
| Responsive | 768 × 1024, 3 thèmes | PASS 3/3 | géométrie + captures |
| Responsive | 1440 × 900, 3 thèmes | PASS 3/3 | géométrie + captures |
| Responsive | 2560 × 1440, 3 thèmes | PASS 3/3 | géométrie + captures |
| Responsive | débordement global | PASS 12/12 | aucun scrollWidth global supérieur |
| Responsive | géométrie composants | FAIL | 390 démontre qu'un PASS global serait faux |
| Thèmes | Classic / Glass Light / Glass Dark | PASS visuel limité | rendu présent; mêmes défauts mobiles |
| Console | erreur critique | PASS | zéro pendant la matrice |
| Accessibilité | noms accessibles des actions | PARTIEL / NOT_VERIFIED | texte présent; audit ARIA exhaustif non effectué |
| Accessibilité | clavier et focus visible | NOT_VERIFIED | hors campagne finale |
| Modales | ouverture/annulation/validation | NOT_VERIFIED | aucune mutation documentaire déclenchée |

## Résumé quantifié

- Matrice responsive : **9/12 PASS**, **3/12 FAIL**.
- Contrôles automatisés consolidés : **15 PASS**, **6 FAIL** sur 21.
- Défauts serveur bloquants/élevés : PROJ-DETAIL-001 à 003.
- Défauts UX/résilience démontrés : PROJ-DETAIL-004, 005, 007 et 009.
- Intégrité concurrente : PROJ-DETAIL-006.

La matrice n'étend pas l'acceptation aux sous-écrans ou aux opérations documentaires exclues.
# Mise à jour de clôture

La matrice ci-dessous conserve l'état initial audité. Le candidat corrigé et ses
preuves sont réconciliés dans `PROJECT-DETAIL-CORRECTION-ACCEPTANCE.md` : 22/22
contrôles API/navigateur et 12/12 configurations responsive passent en QA isolée.
La vérification de production reste conditionnée à la release gouvernée.
