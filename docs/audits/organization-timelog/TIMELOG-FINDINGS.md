# Constats Timelog

## TIME-001 — Validation serveur insuffisante — CRITIQUE — FAIL

- Reproduction : `POST /timelog/me` accepte un corps `any`; `date`, `heures`, `category` et `note` sont transmis directement à Prisma après `new Date`/`parseFloat`.
- Observé : aucune borne positive/maximale, longueur de note, précision, date valide ou appartenance de catégorie n'est vérifiée.
- Impact : valeurs négatives/excessives, catégories arbitraires, erreurs 500 et totaux/capacité incohérents.
- Code : `timelog.controller.ts`, `timelog.service.ts:addEntry/updateEntry`.
- Correction : DTO typés, validation stricte, politique de durée/date/précision, catégorie effective du tenant.
- Recette : matrice zéro/négatif/excessif/NaN/précision/date/catégorie, sans écriture sur refus.

## TIME-002 — Concurrence sans détection — ÉLEVÉE — FAIL

- Reproduction : deux sessions mettent à jour la même entrée; `updateMany` ne vérifie ni version ni `updatedAt`.
- Observé : dernière écriture gagnante silencieuse; suppression concurrente renvoie seulement un compteur Prisma.
- Impact : perte de correction historique et incohérence des totaux.
- Correction : `lockVersion` ou précondition équivalente, conflit 409 et rafraîchissement explicite.

## TIME-003 — Erreurs invisibles dans l'interface — ÉLEVÉE — FAIL

- Reproduction : échec GET/POST/PUT/DELETE; tous les `catch` font uniquement `console.error`.
- Impact : écran vide ou ancien, modal conservé sans explication, aucune reprise guidée, risque de nouvelle tentative ambiguë.
- Correction : état d'erreur accessible, conservation du formulaire, bouton Réessayer, corrélation et protection contre doublon.

## TIME-004 — Date civile traitée comme instant UTC — MOYENNE — FAIL

- Reproduction : le champ `YYYY-MM-DD` est construit avec `new Date(dto.date)` et affiché avec les APIs locales du navigateur.
- Impact : décalage potentiel de jour selon fuseau/DST; bornes inclusives non contractualisées.
- Correction : modèle de date civile explicite ou normalisation America/Toronto testée aux changements DST.

## TIME-005 — Règle métier des durées absente — MOYENNE — DÉCISION_PRODUIT_REQUISE

Définir minimum, maximum quotidien, incrément, précision, dates futures et chevauchements. Le HTML propose 0,25 h mais le serveur ne l'impose pas.

## TIME-006 — Permissions de base — PASS statique / QA dynamique NOT_VERIFIED

L'acteur et le tenant sont dérivés du JWT; les clients sont exclus; la vue équipe exige ADMIN/SUPER_ADMIN. Une campagne API avec deux tenants et identité désactivée reste nécessaire.
