# Sécurité

Profil : `WEB_VIEW_ONLY`. `WEB_MANAGED_KIOSK` et `WEB_EMERGENCY_ELIGIBLE` restent inactifs. La session enrôlée demeure requise pour les rendus privés; anti-framing, politique de référent, activation temporaire, rotation et révocation proviennent des garanties DISPLAY-09 inchangées.

Scan ciblé de secrets PASS; `git diff --check` PASS; audits runtime portail/backend : 0 vulnérabilité de production. Aucun secret, identifiant canonique, coordonnée ou URL exploitable n'est ajouté.
