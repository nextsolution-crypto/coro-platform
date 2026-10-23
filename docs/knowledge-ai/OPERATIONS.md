# Knowledge / CORO AI — exploitation

## Politique persistante et livraison

La politique privée du serveur `/etc/coro-ai/runtime-policy.json` appartient à root, répertoire 0700 et fichier 0600. Exemple de contenu autorisé :

```json
{"schemaVersion":1,"bedrockEnabled":true,"localOcrEnabled":true}
```

Elle ne contient aucun secret. Son absence désactive Bedrock et l’OCR. Une politique malformée ou accessible à d’autres utilisateurs bloque la livraison. Le déploiement gouverné applique la politique à chaque release, avec les quatre images immuables habituelles. Il vérifie le fournisseur, les montages en lecture seule et la durée de session de 900 secondes. Un appel Bedrock synthétique doit réussir avant le succès final. En cas d’échec du fournisseur, le backend est recréé sans les montages AWS et la release reste en échec : ne pas la déclarer réussie. Le manifeste conserve les preuves synthétiques et l’état du runtime.

Pour désactiver : passer `bedrockEnabled` à `false` puis utiliser la livraison gouvernée. Modifier le fichier seul ne change pas un conteneur existant. Ne jamais restaurer automatiquement la base de données après un échec applicatif. Une ancienne release ne connaît pas nécessairement cette politique : vérifier explicitement son comportement avant tout retour arrière.

## Diagnostic en lecture seule

Après installation de cette release :

```sh
node /opt/coro-platform/ops/knowledge/health.mjs
```

Le diagnostic affiche uniquement des agrégats : état du runtime, échéance du certificat public, statuts d’indexation, codes d’erreur et statuts d’interaction des dernières 24 h. Les appels et jetons correspondent à la dernière heure, limitée aux 10 000 dernières lignes de journal. Ces compteurs peuvent être incomplets après rotation et ne remplacent pas la facturation AWS. Aucun texte documentaire, question, réponse ou identifiant personnel n’est émis.

Le service et le timer fournis dans `ops/knowledge/` peuvent être installés dans `/etc/systemd/system/`, puis activés avec `systemctl enable --now coro-knowledge-health.timer`. Le journal local se consulte par `journalctl -u coro-knowledge-health.service`. Le code de sortie 2 signale un renouvellement du certificat à prévoir sous 14 jours ; 1 signale une panne. Aucun courriel n’est envoyé par ces unités.

## Indexation, reprise et cycle de vie

ProjectFile demeure l’autorité canonique. Seules les versions approuvées, effectives, non expirées et non remplacées peuvent être publiées dans l’index. La source est vérifiée à nouveau au moment de publier les chunks. La révocation et l’expiration sont filtrées dès la recherche, avant la réconciliation périodique.

Le pipeline V2 réindexe progressivement les versions admissibles. Une ingestion interrompue depuis au moins 15 minutes devient FAILED. La reprise automatique est espacée de cinq minutes, au maximum trois tentatives. Une reprise manuelle utilise l’API d’indexation authentifiée existante et l’autorité du projet ; ne pas réinitialiser les statuts par SQL. Un fichier défectueux ne doit pas monopoliser la réconciliation.

## OCR local

Poppler rasterise et Tesseract lit les pages en français et anglais, dans le conteneur du backend. Aucun service OCR externe n’est appelé. Les processus ne reçoivent pas les variables AWS. Les fichiers temporaires sont privés et supprimés à la fin. Une extraction incomplète ou incertaine est refusée entièrement.

Périmètre : pages contenant une image et moins de 120 caractères natifs, dont les PDF entièrement scannés et les documents alternant pages natives et scannées. Les images incorporées dans une page ayant déjà un texte natif conséquent ne sont pas analysées. Les tableaux complexes, manuscrits et scans dégradés ne sont pas garantis. La confiance Tesseract est un filtre technique, pas une preuve de vérité : les citations restent nécessaires.

Limites par défaut : PDF 50 Mo, 500 pages au total, 8 pages OCR, raster limité à 1 800 pixels, confiance pondérée minimale 80/100, 20 secondes par commande OCR, 120 secondes pour l’extraction entière, sortie 10 Mo, deux extractions simultanées au maximum par instance du backend. Le dépassement ou l’indisponibilité du moteur produit un code d’erreur et aucune projection READY partielle.

## Certificat et coûts

Le certificat public courant était valide jusqu’au 21 janvier 2027 à 01:22:40 UTC lors de la préparation. Le diagnostic lit le certificat réellement monté : cette date documentaire ne le remplace pas. La session AWS de 900 secondes se renouvelle via credential_process ; elle ne renouvelle pas le certificat X.509.

Avant échéance, générer une nouvelle demande de certificat selon la procédure PKI existante, faire signer par l’autorité détenue par le responsable, vérifier chaîne, sujet, usage et dates, puis remplacer atomiquement le certificat public avec les mêmes permissions. Si la clé change, son entrée et la signature par l’autorité restent sous contrôle du détenteur. Ne jamais copier la clé privée dans Git, les journaux ou le navigateur. Vérifier ensuite le smoke synthétique et la politique de session. Ne pas régénérer l’autorité de confiance pour contourner une phrase secrète inconnue.

Les alertes de budget AWS ne constituent pas un plafond de dépense. Contrôler le budget existant et la facturation dans AWS ; les jetons locaux servent au diagnostic de consommation, sans estimation monétaire non vérifiée.

## Recette et vérité des preuves

Le corpus `coro-backend/assets/knowledge-qa/` est intégralement fictif. Il contient trois pages natives avec tableau, une version remplacée, une source contradictoire, un scan et un document mixte. Le générateur et l’inventaire SHA-256 sont versionnés. Ne jamais utiliser ces contenus en intervention réelle.

La recette PostgreSQL utilise uniquement une base locale dont le nom contient « test ». Elle exécute les transitions canoniques, la recherche autorisée et le rejet d’une révocation pendant l’extraction. La CI construit aussi l’image avec ses vrais moteurs OCR. Les résultats locaux, CI et production doivent être rapportés séparément ; un test simulé ne prouve pas une invocation Bedrock réelle.

## Admission des questions

Une citation valide ne suffit pas à prouver qu’une réponse parle du sujet demandé. Avant l’appel au modèle, les termes substantiels de la question doivent apparaître dans chaque extrait envoyé au modèle ou sa provenance, après normalisation simple. Les extraits portant sur un autre sujet sont écartés. Une entité absente, même entourée de mots communs comme « code » ou « document », provoque une abstention sans invocation Bedrock. Les contradictions numériques détectées sont également arrêtées avant le modèle.

Ce contrôle est volontairement conservateur : un synonyme ou une formulation absente peut demander une reformulation avec les termes du document. Il ne constitue pas une preuve générale d’implication sémantique. La recette inclut le cas « Orme » absent des sources, qui ne doit jamais récupérer le code d’un autre document.
