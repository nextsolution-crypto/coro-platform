# Prochaine autorisation minimale requise

La release ne peut pas encore être soumise à autorisation finale.

Deux interventions circonscrites sont nécessaires :

1. **Provenance Tour Prémont** — fournir ou faire valider par une autorité de données un artefact indépendant et vérifiable établissant que le bâtiment canonique est synthétique et ne représente aucun client réel. Après cette preuve seulement, autoriser explicitement l'enregistrement gouverné, idempotent et audité du `DemoFixtureRecord`.
2. **Origine** — autoriser une inspection serveur strictement en lecture seule du certificat d'origine, de sa chaîne/expiration et du routage virtual-host pour `display.getcoro.io`, sans DNS ni redémarrage.

Une fois ces preuves PASS, une autorisation distincte pourra couvrir les gates frais capacité/sauvegarde/restauration/rollback, les migrations Display, les quatre digests exacts, l'inspection post-release, puis séparément le DNS et le pilote `WEB_VIEW_ONLY` après Gate 1B.
