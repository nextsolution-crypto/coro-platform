# CP-004 à CP-007 — état de clôture et preuves

Mise à jour : 24 octobre 2026, America/Toronto.

## CP-006 — ressources annexes

- **Défaut reproduit :** plusieurs routes de commentaires, versions,
  engagements et signatures lisaient ou modifiaient une ressource par son
  identifiant sans hériter systématiquement de la portée du projet parent.
- **Règle :** résoudre le parent côté serveur, puis appliquer organisation,
  client et bâtiments affectés avant contenu, métadonnée, URL ou mutation.
- **Correction :** garde canonique partagée; portée ProjectFile corporate
  organisationnelle restaurée sans accès inter-tenant.
- **Tests :** 82 tests ciblés, TypeScript/build et matrice PostgreSQL
  multi-organisation/multi-client; refus avant lecture, écriture ou notification.
- **Livraison :** PR #47, SHA `8a16b30c1c3780923f9e2700baa7c7fa746669e8`;
  release `40116294651` SUCCESS; inspection `40117291362` PASS/GO.
- **Statut :** CLOS.

## CP-007 — provenance des commentaires

- **Défaut reproduit :** `ClientUser.id` était écrit dans la clé étrangère
  `ProjectComment.userId`, réservée à l’auteur interne `User`.
- **Règle :** auteur typé, exactement un `INTERNAL_USER` ou `CLIENT_USER`,
  dérivé de la session; aucune usurpation par valeur navigateur.
- **Correction :** migration additive
  `20261107010000_project_comment_typed_actor`; historique interne préservé;
  FK composites tenantées et contrainte exactement-un-auteur.
- **Tests :** 37 tests unitaires, Prisma/TypeScript, PostgreSQL depuis migration
  complète; auteur client, historique interne et auteur mixte invalide.
- **Livraison :** PR #48, SHA `4bb9e36911398a6e0a92ab25135f6ef135c2a411`;
  release combinée `40118313963` SUCCESS; inspection `40119271708` PASS/GO.
- **Statut :** CLOS.

## CP-005 — refus documentaire

- **Défaut reproduit :** le refus pouvait changer le statut et créer
  commentaire/notifications sans contrôle préalable du projet, du rôle et de
  l’état métier.
- **Règle :** autoriser avant mutation; transaction atomique; effets externes
  seulement après victoire; répétition et concurrence idempotentes.
- **Correction :** accès canonique, rôles clients explicites, transition
  conditionnelle transactionnelle et commentaire client typé.
- **Tests :** 10 tests ciblés et PostgreSQL; refus hors scope sans changement
  d’état, commentaire, notification ou courriel; répétition sans duplication.
- **Livraison :** PR #49, SHA `3829afc6563da5c196942b22d59f50131cea1e88`;
  release `40118313963` SUCCESS; inspection `40119271708` PASS/GO.
- **Statut :** CLOS.

## CP-004 — agrégations Intelligence

- **Défaut reproduit :** l’overview transmettait seulement l’organisation et
  agrégeait des bâtiments hors client/périmètre du `CLIENT_MANAGER`.
- **Règle :** filtrer les lignes autorisées avant compteurs, scores,
  recommandations et incidents; préserver la vue organisationnelle explicite
  du `CLIENT_CORPORATE`.
- **Correction :** acteur complet transmis au service; filtre
  organisation/client/bâtiments avant toute agrégation; rôle inconnu fail-closed.
- **Tests :** test unitaire 3/3, matrice PostgreSQL manager/corporate/autre
  tenant, TypeScript et build; CI `40117984030` SUCCESS.
- **Livraison source :** PR #50, SHA
  `e94e4f3d7b3a00406dcc56f0e5123a38235a3492`.
- **Capacité :** Droplet étendu de manière gouvernée à 2 vCPU, 4 Go RAM et
  80 Go disque. Audit `40121361626` SUCCESS : 43 116 140 480 octets libres,
  besoin release 19 700 652 056, marge 23 417 448 424, gates backup/release vrais.
- **Release :** successeur documentaire `1e67c77ea5a3eb61fb4a8e32e30e92845411a277`,
  workflow `40121511765` SUCCESS, quatre images immuables.
- **Production vérifiée :** inspection `40122406450` PASS/GO sur `1e67c77…`,
  migration 153, backup `REMOTE_VERIFIED`, restore `RESTORE_VERIFIED`, quatre
  rollback, verrou libre et services sans redémarrage.
- **Statut :** CLOS côté serveur/PostgreSQL/production; preuve navigateur
  synthétique 12/12 encore `NOT_VERIFIED`.

## Limite transversale

La matrice navigateur authentifiée n’a pas été rejouée dans cette session : le
runtime Chrome/QA local n’était pas disponible. Les preuves négatives serveur
et PostgreSQL sont réelles, mais ne doivent pas être présentées comme une
preuve visuelle 12/12. Cette limite n’autorise ni la réouverture de CP-002/003
sans régression ni un feu vert commercial global.
