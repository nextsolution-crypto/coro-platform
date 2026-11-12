# Intégrité du runtime

`verifyRuntimeIntegrity` compare chaque fichier critique à une empreinte SHA-256, refuse les chemins `..` et les manifestes mal formés. Un fichier conforme passe; une modification produit `RUNTIME_INTEGRITY_MISMATCH`.

La distribution signée future devra signer le manifeste d’empreintes avec une clé de release hors appareil, puis valider version et rollback avant activation. Aucun mécanisme de mise à jour automatique non gouverné n’est ajouté.
