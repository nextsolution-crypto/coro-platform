# Fiche unique d’ouverture — pilote autonome du portail client

Statut : `À COMPLÉTER ET À APPROUVER PAR MATHIEU — AUCUNE ACTIVATION`

Verdict commercial : `PILOTE ENCADRÉ`

Cette fiche constitue le dossier unique de décision. La compléter ne crée
aucun compte, n’active aucune organisation et n’autorise aucun envoi. Une
instruction d’ouverture distincte de Mathieu demeure obligatoire.

## 1. Décision demandée

- [ ] J’approuve le périmètre, les participants et les conditions ci-dessous.
- [ ] J’autorise ensuite le changement gouverné de configuration et des comptes.
- [ ] Je confirme qu’aucune invitation ne doit partir avant une instruction d’envoi séparée.
- Décision de Mathieu : **À COMPLÉTER**
- Nom, date et référence d’approbation : **À COMPLÉTER**

## 2. Organisations et bâtiments

Chaque identifiant doit être relevé depuis l’autorité canonique CORO et revu
par une seconde personne. Ne pas utiliser un nom affiché comme identifiant.

| Organisation participante | ID canonique | Bâtiments autorisés | IDs canoniques des bâtiments | Confirmé par |
|---|---|---|---|---|
| **À COMPLÉTER** | **À COMPLÉTER** | **À COMPLÉTER** | **À COMPLÉTER** | **À COMPLÉTER** |

- [ ] toutes les organisations appartiennent au périmètre approuvé;
- [ ] chaque bâtiment appartient à la bonne organisation et au bon client;
- [ ] aucun bâtiment implicite ou affectation obsolète n’est conservé;
- [ ] chaque organisation participante figure dans la configuration de restrictions.

## 3. Utilisateurs, rôles et affectations

| Utilisateur nommé | Organisation | Client | Rôle canonique | Bâtiments/portefeuille | MFA | État demandé |
|---|---|---|---|---|---|---|
| **À COMPLÉTER** | **À COMPLÉTER** | **À COMPLÉTER** | `CLIENT_MANAGER` ou `CLIENT_CORPORATE` — **À COMPLÉTER** | **À COMPLÉTER** | Obligatoire | **À COMPLÉTER** |

- `CLIENT_MANAGER` reste limité à son organisation, son client et ses bâtiments explicitement affectés;
- `CLIENT_CORPORATE` conserve seulement sa portée organisationnelle légitime;
- la restriction pilote n’accorde aucun droit et ne remplace jamais les permissions, affectations, statuts actifs ou contrôles tenant;
- aucun compte personnel de Mathieu, compte partagé ou compte hors organisation participante ne doit être utilisé;
- les comptes ne sont créés ou activés qu’après l’instruction d’ouverture.

## 4. Responsables, support et calendrier

- Responsable produit : **À COMPLÉTER**
- Responsable technique : **À COMPLÉTER**
- Responsable client/pilote : **À COMPLÉTER**
- Contact et canal de support : **À COMPLÉTER**
- Heures et délai de réponse : **À COMPLÉTER**
- Escalade sécurité/opérations : **À COMPLÉTER**
- Début du pilote : **À COMPLÉTER**
- Fin ou date de revue : **À COMPLÉTER**
- Conditions commerciales et consentements : **À COMPLÉTER**

## 5. Fonctions incluses

- [ ] tableau de bord, bâtiments et projets autorisés;
- [ ] consultation et téléchargement documentaire autorisés;
- [ ] Intelligence cloisonnée au périmètre autorisé;
- [ ] Knowledge sur sources approuvées et formats pris en charge;
- [ ] coffre hors ligne pour documents non sensibles admissibles;
- [ ] activités et notifications en consultation;
- [ ] profil, changement de mot de passe, session et déconnexion;
- [ ] gestion locale des employés Sentinelle sans livraison externe, si le module est inclus;
- [ ] manuel et navigation secondaire validée.

## 6. Exclusions maintenues

- signature et PDF officiel;
- réservations et annulations;
- invitations Sentinelle, courriels, SMS et communications externes;
- fonctions avancées Sentinelle non validées;
- alertes et opérations d’urgence;
- mutations et régénérations de projets archivés;
- carte externe comme parcours obligatoire.

Un `403` explicite du serveur prévaut sur l’affichage. La proposition « lecture
seule avec réouverture explicite et tracée » n’est pas approuvée et aucun
parcours de réouverture n’est inclus.

## 7. Réussite, suspension et clôture

Réussite : zéro fuite inter-tenant/hors bâtiment; zéro effet externe non
autorisé; parcours inclus réalisés; incidents analysés et clos; utilité
confirmée par participants et responsables; **indicateurs additionnels : À COMPLÉTER**.

Suspension immédiate si : accès inter-tenant/hors bâtiment, action exclue
accessible, effet externe non autorisé, mutation inexpliquée, MFA/session ou
service critique indisponible, ou résultat d’une opération indéterminé.

Clôture : revue finale, incidents traités, comptes suspendus ou retirés selon
décision, preuves conservées, puis décision écrite de terminer, prolonger ou
ouvrir un nouveau lot.

## 8. Configuration préparée — ne pas appliquer

Sémantique vérifiée dans `ClientPilotPolicyService` :

```text
CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS=<ORG_ID_1>,<ORG_ID_2>
```

Valeur exacte proposée après remplissage :

```text
CLIENT_PORTAL_RESTRICTED_PILOT_ORGANIZATION_IDS=À_COMPLÉTER
```

La valeur est une liste CSV d’identifiants canoniques; les espaces sont
supprimés et les valeurs vides ignorées. Elle désigne les organisations
auxquelles les restrictions sont appliquées. Elle **n’autorise pas** l’accès au
portail. Une organisation absente conserve son comportement historique; une
valeur vide désactive toutes les restrictions pilotes et ne doit jamais servir
à suspendre le pilote.

Avant le changement, produire une table prouvant que chaque compte participant
possède exactement l’un des `organizationId` configurés et seulement ses rôles,
clients, bâtiments et affectations approuvés.

## 9. Changement gouverné et retour arrière

1. obtenir l’approbation et l’instruction d’ouverture de Mathieu;
2. vérifier IDs, comptes, MFA, affectations, sauvegarde et rollback;
3. arrêter si une release ou maintenance est active;
4. ajouter les IDs approuvés à la valeur existante sans retirer une organisation déjà restreinte;
5. appliquer la configuration serveur par le pipeline gouverné avec image immuable;
6. remplacer uniquement le service prévu, puis exécuter la section 10;
7. ouvrir les comptes seulement après résultat conforme.

La variable est lue lors des requêtes, mais le processus reçoit la nouvelle
valeur seulement après son remplacement gouverné. La configuration ne révoque
pas les JWT existants; après remplacement, ces sessions sont immédiatement
soumises aux restrictions de leur `organizationId`.

Retour arrière sûr : conserver au minimum l’union des organisations
participantes et déjà restreintes, puis corriger la liste par le même pipeline.
Ne jamais retirer une organisation pour suspendre le pilote. Avant un rollback
vers une image sans ces restrictions, désactiver explicitement tous les comptes
participants et vérifier le refus de leurs sessions. Le garde JWT relit
`ClientUser.isActive` à chaque requête; la désactivation refuse donc les sessions
déjà ouvertes. Ne supprimer aucune donnée, aucun document ni aucune preuve.

## 10. Vérification courte après activation

Pour un manager puis un corporate approuvés :

1. connexion MFA et vérification organisation, client, rôle et bâtiments;
2. parcours inclus disponibles dans le bon périmètre;
3. signature/PDF refusés, sans demande, tâche, notification ni fichier;
4. invitation refusée, sans invitation, courriel ni appel fournisseur;
5. projet archivé consultable/téléchargeable, mais mutation et régénération refusées;
6. support et procédure de signalement accessibles;
7. contrôle inter-tenant avec preuve synthétique autorisée;
8. consignation du SHA, de la configuration masquée, des comptes et résultats, sans secret.

Tout échec maintient les comptes suspendus et le statut
`DÉMONSTRATION ACCOMPAGNÉE UNIQUEMENT`.

## 11. Signalement d’un incident

Arrêter le parcours sans répéter une mutation incertaine; noter heure,
utilisateur, organisation, bâtiment, route et corrélation sans secret; conserver
la preuve; contacter le support; vérifier le résultat serveur avant toute
reprise; suspendre explicitement les comptes si l’isolation, l’intégrité ou un
effet externe est incertain.
