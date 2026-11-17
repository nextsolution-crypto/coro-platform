# INC-RP-01 - Lot 5 - Acceptation

## Matrice obligatoire

| Controle | Attendu |
|---|---|
| Version brouillon | export refuse avant stockage |
| Version approuvee figee | export PDF prive cree |
| Rejeu meme cle | meme enregistrement, aucun doublon |
| Deux demandes concurrentes | une seule cle idempotente admise |
| Letter / A4 | dimensions et pagination valides |
| Francais / anglais | libelles corrects |
| Sections conditionnelles vides | absentes du PDF |
| Sections repetables | toutes les occurrences presentes |
| Contenu de controle | caracteres neutralises, aucun HTML execute |
| Empreinte alteree | telechargement refuse |
| Autre organisation ou batiment | ressource introuvable |
| Permission export absente | ressource introuvable |
| Affectation absente ou revoquee | refus immediat |
| MIME/extension/signature incoherents | rejet avant ClamAV |
| ClamAV absent, erreur ou delai | rejet fail-closed |
| Objet reference | jamais candidat orphelin |
| Export en cours | protege par le reconciliateur |
| Objet recent | protege par la periode de grace |
| Objet ancien non reference | candidat dry-run, cle non divulguee |

## Recette visuelle

Rendre chaque exemple en PNG avec Poppler et verifier : marges, retours de ligne, titres, sections, tableaux repetables, pied de page, absence de chevauchement et lisibilite a 100 %. La validation visuelle ne remplace pas la verification de l'empreinte ni les tests PostgreSQL.

## Gate commercial

La fusion de ce lot ne constitue pas une activation. `INCIDENT_REPORTS_ENABLED=false` demeure la valeur requise en production. Une recette authentifiee complete et une autorisation distincte sont requises avant exposition client.
