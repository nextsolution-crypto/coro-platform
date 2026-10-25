# Recette complète du portail client — point de situation

Date d'exécution : 2026-10-25
Commit de base testé : `46926d0cc671c1a08cb2c04b52dbb3bfe77ba504`
Branche candidate : `qa/complete-client-portal-e2e`

## Résultats démontrés

| Domaine | Résultat | Preuve |
|---|---|---|
| Readiness du stack | PASS | PostgreSQL 16, 154 migrations, backend, portail, stockage privé, MFA et réseau isolé |
| QA Identity Lab | PASS | 9 acteurs, mots de passe synthétiques, périmètres, CORS et egress provider refusé |
| Réservations | PASS | création canonique, conseiller admissible et disponible, annulation, refus inter-tenant |
| Sentinelle employés | PASS | création locale, mise à jour, suppression et courriel accepté par le faux fournisseur |
| Invitations Sentinelle | PASS_SIMULATED_PROVIDER | invitation persistée après acceptation du faux fournisseur; aucune livraison réelle revendiquée |
| Atomicité fournisseur | PASS | tests ciblés et campagne précédente : aucune ligne partielle après échec |
| Listes et consultations | PASS | 14 lectures existantes |
| Refus de périmètre | PASS | 7 refus bâtiment/tenant et aucune donnée protégée retournée |
| Navigateur | PASS 12/12 | 4 viewports × Classic, Glass Light et Glass Dark |
| Responsive composants | PASS | bounding boxes, débordement global/composant et actions accessibles |
| États d'erreur | PASS 4/4 | activités, notifications, carte et réservations avec nouvelle tentative |
| Session | PASS | F5, persistance, déconnexion et purge du jeton local |

Preuves principales :

- `D:\CORO-QA\runs\complete-qa\evidence\portal-functional-success\portal-functional-inventory.json`
- `D:\CORO-QA\runs\complete-qa\evidence\portal-browser-final\portal-browser-inventory.json`
- captures PNG dans le même dossier navigateur.

## Limites encore ouvertes

### SIGN-01 — VALIDÉ_QA_SYNTHÉTIQUE

CAUSE : la matérialisation officielle utilisait l'ancien
`StorageService.uploadFile`, qui crée un objet `public-read`, tandis que les deux
endpoints de récupération suivaient directement l'URL persistée.

CORRECTION : les nouveaux PDF officiels utilisent une clé privée déterministe
liée à l'organisation, au projet, à la version et à la langue. La base ne reçoit
qu'une référence opaque `coro-private:v1:` après stockage et relecture intègres
des deux fichiers. Une reprise réutilise un objet aux octets identiques et refuse
un remplacement divergent. Les téléchargements passent par l'autorité privée
après l'autorisation projet existante.

COMPATIBILITÉ : les références historiques HTTPS restent lisibles uniquement
depuis l'origine CDN CORO configurée, sous `/documents/`, sans authentifiants,
paramètres, fragment ni redirection. Toute autre URL échoue fermée. L'existence
éventuelle d'anciens objets publiquement accessibles en production n'a pas été
inspectée ni remédiée par ce lot; elle demeure un contrôle de remédiation
historique distinct, sans déplacement ni suppression automatique.

PREUVES :

- `D:\CORO-QA\runs\complete-qa\evidence\signature-official-private\signature-official.json`
  — 9/9 PASS : source canonique, signature synthétique, références privées FR/EN,
  reprise idempotente, PDF ouvrable de 3 847 333 octets avec SHA-256, refus
  anonyme 401 et inter-tenant 404;
- `D:\CORO-QA\runs\complete-qa\evidence\signature-official-pilot-denial\signature-official-pilot-denial.json`
  — 11/11 PASS : manager et corporate restreints, lancement, statut, relance et
  récupération refusés; organisation synthétique hors pilote non restreinte;
- tests ciblés : 33/33 PASS, incluant échec de stockage sans persistance de faux
  succès, conflit immuable, reprise, format historique autorisé et rejet SSRF;
- TypeScript `--noEmit` et construction de l'image backend QA : PASS.

LIVRAISON : PR #66 fusionnée au SHA
`c7ad9e46f15b7422bb4b5052c708a50688ee50ba`. CI de branche principale
`40212425790` et release gouvernée `40212760340` : SUCCESS. L'inspection
post-release en lecture seule `40213744144` confirme le même SHA actif, la
release `SUCCEEDED/COMPLETED`, la migration
`20261108010000_client_password_change_audit`, les quatre images applicatives
immuables actives, PostgreSQL sain, la sauvegarde `REMOTE_VERIFIED`, la
restauration `RESTORE_VERIFIED` et quatre images de rollback disponibles.

LIMITES : la panne privée a été injectée de façon déterministe au niveau du
service; un arrêt réseau réel du stockage privé pendant une nouvelle signature
n'a pas été rejoué. Aucune signature fournisseur réelle ni valeur juridique du
document n'est démontrée. L'exposition publique éventuelle de références
historiques n'a pas été inspectée et demeure un chantier de remédiation séparé.

STATUT : le parcours technique SIGN-01 est validé en QA synthétique, publié et
déployé dans la production privée. Cela ne valide ni un fournisseur de signature
réel ni la valeur juridique du document.

### SIGN-01-HISTORIQUE — REMÉDIÉ_PRODUCTION

INVENTAIRE : l'audit en lecture seule `40215430217` a couvert les deux projets
portant une référence officielle, soit quatre références FR/EN. Il a démontré
quatre références HTTPS historiques, quatre objets existants accessibles sans
authentification, aucune référence absente, cassée ou non vérifiable. Seuls des
compteurs agrégés ont été journalisés; aucune référence, donnée personnelle ou
contenu documentaire n'a été publié.

REMÉDIATION : le SHA `2e1245a80fda6b3d106bbccc0779d73f9b3789f9`
authentifie aussi la lecture des références historiques. La procédure gouvernée
`40217599442` a créé et vérifié quatre copies privées immuables, retiré l'accès
public aux quatre objets d'origine, démontré leur refus anonyme, puis remplacé
les quatre références avec contrôle de concurrence. L'origine configurée était
le point de terminaison du stockage et non un CDN distinct; aucune purge de
cache séparée n'était applicable. Le retour arrière conserve les références
privées et ne rétablit jamais une ACL publique.

VÉRIFICATION FINALE : l'audit `40217679351` retrouve quatre références
canoniques privées, zéro référence HTTPS historique, zéro objet public, zéro
objet absent ou cassé et zéro résultat non vérifiable. L'inspection de production
post-migration `40217732206` est PASS.

STATUT : constat d'exposition historique clos. Le fournisseur de signature réel
et la valeur juridique demeurent `NOT_VERIFIED` et distincts de cette preuve de
stockage.

### SENT-ADV-01 — PARTIAL

LIMITATION : les listes employés, invitations, évacuations, historique,
rapports et statut population sont lisibles et responsives; les mutations de
présence, visiteur, kiosque et rapport avancé ne sont pas toutes exercées.

IMPACT : les fonctions avancées non exercées ne doivent pas être promises dans
le pilote.

CONDITION DE LEVÉE : scénario canonique arrivée/départ employé et visiteur,
kiosque QA, historique/rapport et refus bâtiment/tenant.

RESPONSABLE : équipe QA/produit CORO.
STATUT : compatible avec un pilote limité.

### MAP-01 — PARTIAL

LIMITATION : la page, la navigation, le repli et l'erreur explicite sont
validés; aucune dépendance cartographique externe réelle n'a été contactée.

IMPACT : la carte réseau complète ne peut pas être présentée comme validée.

CONDITION DE LEVÉE : fournisseur approuvé et épinglé, politique de
confidentialité/CSP, puis recette disponible/indisponible.

RESPONSABLE : Founder/produit pour le fournisseur, QA pour la recette.
STATUT : compatible avec un pilote utilisant la liste/repli.

## Verdict courant

`PILOTE ENCADRÉ` est conservé. BOOK-01, le chemin d'invitation avec fournisseur
simulé et le chemin technique SIGN-01 sont démontrés; SIGN-01 est présent dans
la version de production privée inspectée. Sa preuve ne valide ni fournisseur
réel ni valeur juridique. La livraison réelle de
courriel, les mutations Sentinelle avancées et les tuiles cartographiques
réelles restent exclues tant que leurs preuves propres ne sont pas acquises.

