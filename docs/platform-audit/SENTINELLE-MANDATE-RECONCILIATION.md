# Sentinelle — réconciliation du mandat PR #72 / PR #73

Date : 25 octobre 2026

Base documentaire : `16700a178e0cebafd1b63be880683042d36a8f33`

Version produit inspectée au départ : `4bbcd8f5842c25115cc214d7265d65d950c9fc9b`

## Matrice réconciliée

| Point du mandat | Statut | Preuve ou limite |
|---|---|---|
| Reconnaissance facultative du téléphone personnel | VALIDÉ | Jeton opaque en cookie `HttpOnly`, empreinte SHA-256 en base, reconnaissance seulement sur choix explicite `rememberDevice`; tests service et PostgreSQL. |
| Expiration du téléphone reconnu | VALIDÉ | Filtre serveur `expiresAt > now`; scénario PostgreSQL d'expiration refusée. |
| Révocation et changement d'utilisateur | VALIDÉ | Révocation serveur, cookie supprimé, nouvelle identification par PIN; correction de « Ce n'est pas moi » afin qu'il révoque réellement la reconnaissance. |
| Plusieurs affichages par bâtiment | VALIDÉ | Deux `PresenceKioskDisplay` nommés pour un même bâtiment, listés et utilisés dans le scénario PostgreSQL. |
| Transaction commencée avant rotation du QR | VALIDÉ | Le challenge est requis au démarrage; la transaction possède ensuite sa propre échéance de cinq minutes. Test PostgreSQL après expiration/rotation du challenge. |
| Historique avancé | VALIDÉ | Autorisation bâtiment/tenant déjà couverte; état d'erreur distinct de l'état vide et reprise; Chrome authentifié 12/12. |
| Rapports d'évacuation avancés | NOT_VERIFIED | Route, autorisation et erreurs liste/détail explicites validées en Chrome 12/12. Aucun rapport peuplé issu d'un exercice synthétique n'a été ouvert/exporté; aucun exercice d'urgence réel n'a été déclenché. |
| Exactitude de l'indice de résilience | VALIDÉ | Test déterministe des composantes rôles 40 %, qualifications 20 %, plans 25 %, exercices 15 %, ainsi que du cas sans sources (score 0, état critique). |
| Récupération par mot de passe oublié | VALIDÉ | Fournisseur simulé : réponse anti-énumération, jeton SHA-256, durée 30 min, claim atomique, politique de mot de passe, révocation des sessions et appareils. Livraison courriel réelle non vérifiée. |
| Magic link | VALIDÉ | Jeton nouvellement stocké en SHA-256, consommation atomique, refus des identités inactives/rejeux, session versionnée; compatibilité des anciens liens limitée à leur durée maximale de 72 h. Livraison réelle non vérifiée. |
| Carte avec dépendances réseau réelles | DÉCISION_ATTENDUE | La navigation de repli et l'erreur sont validées. Les dépendances `unpkg.com`/OpenStreetMap restent interdites par le réseau QA deny-by-default; approbation fournisseur, confidentialité, CSP, épinglage et résilience requis avant preuve réelle. |
| Politique terrain des appareils partagés | DÉCISION_ATTENDUE | Le mécanisme technique permet oubli/révocation/changement d'utilisateur. Le choix d'autoriser la mémorisation sur un appareil partagé, la durée terrain et la responsabilité de déconnexion ne peuvent être validés par un test navigateur. |

## Corrections démontrées

1. **Mauvais utilisateur réaffiché sur un appareil partagé.** Le bouton « Ce
   n'est pas moi » ne faisait qu'effacer l'état React. Il appelle maintenant le
   endpoint de révocation et efface le cookie serveur avant une nouvelle
   identification.
2. **Faux états vides Sentinelle.** Les pannes des historiques, rapports et
   indicateurs de résilience sont désormais visibles, accessibles et
   réessayables; elles ne sont plus présentées comme « aucune donnée ».
3. **Magic link insuffisamment protégé.** Les nouveaux jetons ne sont plus
   persistés en clair et la consommation est atomique. Les comptes inactifs et
   les rejeux échouent fermés.

## Preuves QA

- PostgreSQL 16 jetable, 155 migrations depuis zéro puis head stable.
- Présence : tests service `10/10`, scénarios PostgreSQL `4/4`.
- Authentification/résilience : suites ciblées `27/27`.
- Contrats portail : `7/7` après ajout des états avancés.
- TypeScript backend et Client Portal : PASS.
- Build des images candidates backend et Client Portal : PASS.
- Chrome authentifié : `12/12`, quatre viewports × Classic/Glass Light/Glass
  Dark, plus `7/7` états de panne.
- Preuves assainies :
  `D:\CORO-QA\tracking\client-portal\sentinelle-reconciliation\2026-10-25`.

Le test API transversal a conservé un échec de réservation sans rapport avec
Sentinelle (`409`, aucun conseiller admissible) et zéro défaut Sentinelle. Il
n'est pas utilisé pour rouvrir une campagne indépendante.

## Fournisseurs et exploitation

- Courriel/récupération : comportement applicatif validé avec adaptateur ou
  panne simulée; `REAL_EMAIL_DELIVERY: NOT_VERIFIED`.
- Carte : `REAL_MAP_DEPENDENCIES: NOT_VERIFIED`.
- Aucun SMS, courriel réel, participant réel ni opération d'urgence n'a été
  déclenché.
- Appareil personnel : mémorisation facultative et révocable.
- Appareil partagé : utiliser « Ce n'est pas moi » ou « Oublier cet appareil »;
  une politique terrain (mémorisation interdite ou durée réduite) reste à
  approuver.

Verdict commercial inchangé : `PILOTE ENCADRÉ`.
