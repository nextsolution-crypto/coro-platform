# Recette - rapport d'évacuation peuplé

Date : 2026-10-25

Baseline produit : `ac097c1ff335f3cf832524898bd894ec0cf75963`

Verdict global du portail : `PILOTE ENCADRÉ` (inchangé)

## Périmètre exercé

La recette a utilisé un stack QA isolé avec PostgreSQL 16, les 155 migrations, le backend réel, le Client Portal réel, les identités synthétiques du QA Identity Lab, MFA locale et réseau deny-by-default. Aucun fournisseur externe n'a été appelé.

L'exercice fictif contenait :

- Alice Tremblay, employée, comptabilisée;
- Benoit Roy, employé, comptabilisé;
- Chloe Martin, visiteuse, non comptabilisée;
- David Nguyen, contracteur, non comptabilisé.

Le déclenchement était libellé `Exercice QA sans alarme`. Il a créé seulement l'événement applicatif et son instantané; aucune alarme, invitation, notification, communication ou opération terrain n'a été émise.

## Résultats

| Contrôle | Résultat | Preuve |
| --- | --- | --- |
| Présences initiales et instantané | PASS | 4 présences `IN`, 4 entrées de recensement, trois types de personnes présents dans l'instantané. |
| Actions de recensement | PASS | 2 entrées comptabilisées avec acteur et horodatage; 2 entrées non comptabilisées sans faux horodatage. |
| Compteurs du rapport | PASS | Total 4, comptabilisés 2, manquants 2, taux 50 %. |
| Ordre temporel | PASS | Déclenchement antérieur ou égal aux recensements et à la résolution. |
| Consultation autorisée | PASS | Manager et Corporate de l'organisation A. |
| Refus | PASS | Organisation B et mauvais bâtiment : 403/404 sans rapport; anonyme : 401. |
| Ouverture du rapport | PASS | Les quatre identités, types, entreprises et statuts sont rendus dans le Client Portal. |
| Export effectif | PASS | PDF A4 d'une page, environ 110 Ko, contenant les quatre personnes et les compteurs attendus. |
| Lisibilité du fichier | PASS | Extraction textuelle complète et rendu PNG inspecté : aucune coupure, superposition ou colonne inaccessible. |
| Erreur et nouvelle tentative | PASS | Une réponse synthétique 503 produit un message explicite et un bouton de nouvelle tentative; la tentative suivante recharge la liste. |
| Responsive et thèmes | PASS | 12/12 : 1440x900, 1920x1080, 390x844 et 430x932 en Classic, Glass Light et Glass Dark. |

## Défauts reproduits et corrigés

1. Le détail peuplé conservait une grille fixe de 300 px plus contenu sur mobile. Les contrôles et certaines cartes dépassaient le viewport malgré l'absence de débordement global détectable. La grille devient monocolonne sous 760 px, les statistiques passent en deux colonnes et les rangées/personnes peuvent revenir à la ligne.
2. Une durée résolue de zéro minute était affichée comme `En cours` ou comme un tiret parce que la valeur zéro était traitée comme fausse. La présence de la valeur est maintenant testée explicitement; le PDF et l'écran affichent `0 minutes`/`0m`.

## Preuves

Les preuves assainies sont sous :

`D:\CORO-QA\tracking\commercial-real-estate-master\sentinelle\populated-evacuation-report`

Elles comprennent le résultat JSON structuré, douze captures navigateur, le PDF exporté et son rendu PNG. Les fixtures métier de l'exercice ont été supprimées après chaque exécution; les preuves ont été conservées.

## Limites

- Cet export provient de la fonction d'impression du navigateur. Il ne constitue ni une signature officielle ni une preuve juridique de fournisseur.
- Les dépendances cartographiques Internet n'ont pas été ouvertes dans le réseau QA. Leur configuration et leurs contraintes sont documentées séparément.
- Le verdict commercial reste `PILOTE ENCADRÉ`; cette recette ferme uniquement le point « rapport d'évacuation peuplé ».

## CI documentaire #75

Le workflow GitHub Actions `40226780106` sur `ac097c1ff335f3cf832524898bd894ec0cf75963` est terminé avec la conclusion `SUCCESS`. Les typechecks, tests backend, intégrations PostgreSQL et build du Client Portal sont réussis. Les jobs images et production ont été ignorés conformément au caractère documentaire de la PR.
