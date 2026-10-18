# Liquid Glass V2 — retour arrière et dossier de mise en production (à gouverner séparément)

> **Ce document prépare une décision ; il n’autorise aucun déploiement.** Le mandat 49 interdit : déploiement de production, promotion de la bêta, fusion dans `main`,
> migration de base de données et changement de permission applicative. Tout ce qui suit est soumis à une autorisation distincte du Founder.

## 1. Ce qui change, ce qui ne change pas

| Élément | État après la migration V2 |
|---|---|
| Backend (`coro-backend`), Prisma, migrations, permissions, Platform Authority | **Inchangés** (aucun fichier). |
| Site vitrine (`coro-website`), `ops/`, workflows `.github/` | **Inchangés** (aucun fichier). |
| Logique métier des écrans (API, calculs, rôles, confirmations, contenu documentaire) | **Inchangée**. Seuls des repères (`data-cg-paper`, `data-cg-emergency`, `data-cg-keep`) et des replis de couleur dans les modules CSS ont été ajoutés. |
| Rendu Classique | **Identique** (preuve : instantané de styles calculés avant/après, 0 écart ; voir `ACCEPTANCE-PACKAGE.md`). |
| Défaut utilisateur | **Classique** (240 px de barre latérale). Le Glass est un choix local à l’appareil. |
| Glass pour les routes migrées | **Uniquement** si le build porte le jeton exact `NEXT_PUBLIC_GLASS_BETA=production-preview`. |

## 2. Pourquoi la production actuelle ne montre rien de nouveau

`coro-frontend/Dockerfile`, `coro-client-portal/Dockerfile` et `deploy.yml` ne transmettent **pas** `NEXT_PUBLIC_GLASS_BETA`. Un build issu de la chaîne actuelle n’a donc
jamais le jeton : toutes les routes migrées restent en îlot Legacy (application) ou Classiques (portail). La seule nouveauté visible après un déploiement ordinaire est
la section « Apparence » de `/profile` (déjà présente depuis la V1) ; le portail client n’affiche aucun choix d’apparence hors préproduction.

## 3. Ce qu’il faut décider pour la « revue page par page » du Founder

La revue exige un **build de préproduction** avec le jeton. Cela suppose un changement **hors du périmètre de ce mandat**, à décider et réaliser séparément :

1. Ajouter un `ARG NEXT_PUBLIC_GLASS_BETA` / `ENV` aux deux Dockerfile (application et portail) — valeur vide par défaut.
2. Construire **deux images distinctes** (la production publique ne reçoit jamais le jeton) et les héberger sur un domaine **privé** (hôte non indexé, accès restreint),
   branché sur une API de préproduction ou, à défaut, sur l’API de production uniquement après décision explicite du Founder (les écrans lisent et écrivent de vraies données).
3. Exécuter l’inspection de production en lecture seule existante (`production-inspection.yml`) avant et après.

Aucune de ces étapes n’est effectuée par ce mandat.

## 3 bis. Préconditions techniques vérifiées localement

* TypeScript des deux applications ; builds de production des deux applications **avec et sans** jeton.
* Suites de tests : `test:design-system`, `test:skin` (application et portail), tous les contrats `test:*` des deux applications (voir `ACCEPTANCE-PACKAGE.md`).
* Absence des outils de développement en production : `/glass-kit` introuvable, banc et faux API non atteignables depuis un point d’entrée (tests `production-safety`).
* La feuille de teinte est un fichier statique versionné par son contenu (`glass-skin.<hash>.css`) : un déploiement doit toujours livrer le build **et** son dossier `public/` ensemble.

## 4. Procédures de retour arrière (de la plus légère à la plus complète)

| Niveau | Action | Effet | Qui |
|---|---|---|---|
| 1 | L’utilisateur choisit **Classique** dans « Apparence » | Retour immédiat au rendu Classique, feuille de teinte retirée, sans rechargement. | Utilisateur |
| 2 | Redéployer le build **sans** le jeton `production-preview` | Plus aucune route migrée ne rend de Glass ; l’application retombe en îlot Legacy, le portail en Classique. Aucune donnée n’est touchée. | Exploitation |
| 3 | Retirer la bascule de registre (remettre `status: 'legacy-only'` pour une famille de routes) | Désactive une famille précise sans toucher aux autres. | Développement |
| 4 | `git revert` du ou des commits de migration (famille par famille : les commits sont séparés) | Retour du code. Aucun effet sur le backend ni sur la base : aucune migration associée. | Développement |

Le retour arrière ne nécessite **aucune** opération sur la base de données, aucun nettoyage de stockage serveur et aucun changement de permission : la préférence d’apparence
n’est conservée que dans le navigateur de l’utilisateur (`coro-ui-generation`, `coro-theme-preference`, `coro-glass-sidebar-width`).

## 5. Garde-fous qui continuent de s’appliquer

Founder / Platform Authority et délégations ; refus des ADMIN clients ; défaut Classique ; Glass Light / Dark / System ; `/settings` et `/activities/portfolio` en bêta native ;
rendement (opérationnel et financier) : contenu et contrats inchangés, CAD seul, UNKNOWN sans erreur ; Commercial, Booking, Planning ; garde-fous de retour arrière et de livraison existants.
La page `/admin/platform-permission-grants` est couverte par Glass conformément à l'amendement Founder 27. Sa publication reste conditionnée à la revalidation RBAC sur un vrai backend et ne modifie aucune autorité.

## 6. Risques résiduels à connaître avant la revue

* La couche de teinte repose sur la **valeur** des couleurs. Une nouvelle couleur hex ajoutée plus tard est classée automatiquement (teinte/luminance) mais doit passer
  `npm run test:skin` et le balayage visuel avant d’être livrée.
* Les écrans qui ne se rendent qu’avec des données rares (états d’erreur, modales profondes) ne sont couverts que par les sondes statiques et le balayage des états
  atteignables avec le jeu de données de test : la revue manuelle du Founder reste l’ultime contrôle.
* Pas de test sur appareil mobile réel ni sur Safari/Firefox : navigateur Chrome émulé (320/390/768/1600).
