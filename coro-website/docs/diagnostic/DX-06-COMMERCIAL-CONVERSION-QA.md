# DX-06 — Conversion commerciale facultative

Date de validation locale : 2026-10-27
Branche : `feature/coro-diagnostic-express-v1`
Base du worktree : `80f5c4f00ddeab6c24022cdf56490293caa8456f`
Verdict : **PASS LOCAL — PRÊT POUR VALIDATION DX-06**

## Portée et architecture

DX-06 ajoute, après la restitution du Diagnostic Express, une invitation commerciale discrète et facultative. Le téléchargement du PDF, les recommandations et le résultat demeurent accessibles sans ouvrir ni soumettre le formulaire.

Le parcours réutilise le composant commercial existant `DemoForm` et son intégration Formspree. Son comportement historique demeure le comportement par défaut; une variante additive `diagnostic` porte les champs et consentements propres au diagnostic. Aucun CRM, stockage serveur, outil analytique ou nouvelle dépendance n'a été ajouté.

Le résumé facultatif est construit par une fonction TypeScript pure dans `lib/diagnostic/commercial.ts`, à partir du résultat canonique DX-02/DX-03. Il ne recalcule ni le score ni les priorités.

## Parcours livré

- Invitation : « Vous connaissez vos priorités. Découvrez comment passer à l'action. »
- CTA principal : demande d'évaluation approfondie; il révèle le formulaire sans quitter le résultat.
- CTA secondaire : découverte de CORO.
- Formulaire bilingue FR-CA/EN-CA.
- PDF et recommandations disponibles indépendamment du formulaire.
- Aucune transmission automatique lors de l'affichage du résultat ou de l'ouverture du formulaire.

## Champs et consentement

Champs de la variante Diagnostic Express :

- prénom;
- nom;
- organisation;
- courriel professionnel;
- nombre approximatif de bâtiments, facultatif;
- type de demande;
- message, facultatif;
- consentement facultatif pour joindre un résumé du diagnostic.

Sans consentement, aucun champ de diagnostic n'est inclus dans la requête. Avec consentement, le résumé est limité à :

- version du diagnostic;
- score indicatif ou partiel;
- niveau lorsqu'il est attribuable, sinon mention explicite de résultat provisoire;
- couverture;
- trois priorités d'amélioration au maximum.

Les huit réponses, le PDF et les détails excédant ce résumé ne sont jamais joints. Aucune donnée de résultat n'est placée dans l'URL. Le texte de confidentialité distingue explicitement la demande de contact d'une inscription marketing et nomme Formspree comme service commercial destinataire.

## Contrôles de sécurité et confidentialité

- validations natives et contrôles existants de `DemoForm` préservés;
- endpoint Formspree existant réutilisé, sans secret côté client ajouté;
- résumé construit uniquement depuis le résultat canonique;
- consentement requis avant l'ajout du résumé;
- absence de stockage serveur, de cookie, d'analytics et de nouvelle persistance locale;
- formulaire conservé avec erreur explicite lorsque le fournisseur retourne une erreur;
- comportement historique du formulaire de démonstration couvert par régression;
- aucune transmission réelle de données de test pendant la recette.

## Tests automatisés

| Contrôle | Résultat |
|---|---:|
| Suite complète | PASS — 709/709 |
| Tests DX-06 et régression contact ciblés | PASS — 17/17 |
| TypeScript (`npm run typecheck`) | PASS |
| ESLint ciblé | PASS — 0 erreur, 0 avertissement |
| Build Next.js de production | PASS |
| `git diff --check` | PASS |

Le build a conservé l'avertissement connu du sitemap lorsque l'API du blogue n'est pas joignable localement; les routes statiques demeurent générées. Aucun échec de compilation n'en résulte.

## Recette Chrome réelle

La recette locale a utilisé le site de production local sur `127.0.0.1:3418` et Chrome via CDP. Toutes les requêtes destinées à Formspree ont été interceptées avant sortie réseau et satisfaites par un fournisseur simulé déterministe. Aucun message commercial réel n'a été envoyé.

Scénarios vérifiés :

| Scénario | Résultat |
|---|---:|
| Résultat sans demande commerciale | PASS |
| PDF et recommandations sans formulaire | PASS |
| Formulaire invalide, aucune requête | PASS |
| Demande sans résumé | PASS — aucun champ Diagnostic transmis |
| Demande avec résumé volontaire provisoire | PASS |
| Demande avec résumé volontaire définitif EN | PASS |
| Limite de trois priorités | PASS |
| Erreur fournisseur simulée 500 | PASS — erreur visible, saisie conservée |
| Navigation mobile 390 px | PASS |
| Débordement horizontal | PASS — absent |
| Transmission automatique | PASS — absente |

Le seul message console d'erreur observé correspond au scénario volontaire de réponse Formspree 500. Aucune autre erreur console ou requête échouée n'a été relevée.

## Preuves

- Résultats structurés : `docs/diagnostic/evidence/dx06/dx06-browser-results.json`
- Invitation FR desktop : `docs/diagnostic/evidence/dx06/01-dx06-fr-invitation.png`
- Formulaire FR desktop : `docs/diagnostic/evidence/dx06/02-dx06-fr-form.png`
- Invitation EN mobile : `docs/diagnostic/evidence/dx06/03-dx06-en-mobile-invitation.png`
- Formulaire EN mobile : `docs/diagnostic/evidence/dx06/04-dx06-en-mobile-form.png`

Les captures montrent un formulaire à deux colonnes sur desktop et empilé sur mobile, sans débordement. Les contrôles flottants globaux du site peuvent apparaître au bas d'une capture mobile; le formulaire reste défilable et ses actions restent accessibles.

## Fichiers DX-06

- `app/DemoForm.tsx`
- `app/diagnostic/DiagnosticExperience.tsx`
- `app/diagnostic/diagnostic.module.css`
- `lib/diagnostic/commercial.ts`
- `tests/diagnostic-commercial.test.ts`
- `tests/contact-migration.test.ts`
- `scripts/dx06-browser-qa.mjs`
- preuves et présent rapport sous `docs/diagnostic/`

## Anomalies et réserves

1. **Formspree réel non sollicité.** La disponibilité et la livraison du fournisseur de production ne sont pas démontrées par DX-06, conformément à l'interdiction d'envoyer des données de test à la boîte commerciale sans autorisation.
2. **Protection antispam.** Le mécanisme du formulaire existant est réutilisé sans modification; aucune campagne réelle de validation antispam n'a été exécutée.
3. **Accessibilité du fournisseur.** Les validations applicatives et la navigation clavier sont couvertes localement; les pages ou messages externes de Formspree ne font pas partie du périmètre.
4. **Travail non publié.** Aucun commit, fusion ou déploiement n'a été effectué. La route Diagnostic Express demeure dans le worktree isolé jusqu'à décision explicite.

## Verdict

**DX-06 PASS LOCAL.** Le parcours facultatif respecte l'anonymat du diagnostic, laisse le PDF et les recommandations libres d'accès, réutilise l'autorité commerciale existante et ne transmet un résumé minimal qu'après consentement explicite. La recette avec fournisseur simulé est complète; la transmission Formspree réelle demeure volontairement non vérifiée.

Point d'arrêt respecté : aucune fusion, aucun déploiement et aucun démarrage de DX-07.
