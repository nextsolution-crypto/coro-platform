# Demande d'autorisation de deploiement controle

## Autorisation demandee

**AUTORISATION EXPLICITE DE DEPLOIEMENT CONTROLE DISPLAY-09-DEMO-PILOT.**

Autoriser, dans cet ordre et avec arret sur tout gate critique :

1. revalider `origin/main == 5ae7cd213346169465ee739d09df6d39b26ac6c3`, CI, absence de release concurrente, capacite, sauvegarde/restauration et rollback;
2. construire/publier l'ensemble immutable des quatre images de ce SHA;
3. deploier une seule release gouvernee et appliquer les 11 migrations Display jusqu'a `20261207010000_display_permanent_url_web_player`;
4. inspecter/reconcilier SHA, digests, cinq conteneurs, PostgreSQL et smoke tests;
5. configurer `display.getcoro.io` et TLS uniquement apres validation de la cible DNS/reverse proxy;
6. executer une lecture gouvernee pour resoudre un unique `buildingId` Tour Premont et confirmer son caractere Demo;
7. creer uniquement l'etage, l'emplacement et les ressources portant `display-demo-tour-premont-e03-corridor-est`, avec permissions minimales;
8. importer/approuver/publier les deux PDF synthetiques V1/V2, activer uniquement `WEB_VIEW_ONLY`, tester puis revoquer;
9. fournir l'URL au proprietaire pour la recette physique iPad Safari;
10. produire le rapport post-deploiement distinct.

## Exclusions maintenues

Aucune urgence, Building Bridge, commande Ops/Incident, document client reel, occupant reel, compte reel nouveau, permission globale, SMS/courriel, profil kiosque gere ou activation d'un ecran reglementaire. La PR documentaire #262 ne sera pas fusionnee sans autorisation distincte.

## Conditions de NO-GO

SHA different, CI non PASS, collision de batiment, cible non fictive, DNS/TLS non valide, sauvegarde/restauration non verifiee, capacite insuffisante, rollback incomplet, migration partielle, fuite multitenant ou publication non approuvee.
