# Sécurité

Contrôles démontrés : portées composites organisation/bâtiment/étage/zone, permissions Display dédiées, stockage privé, publications approuvées, SHA de contenu, activation atomique, nonces et idempotence, P-256, manifestes signés, cache atomique, révocation, audit, pagination bornée et refus des ressources inactives.

Tests : 167 unitaires Display PASS, 18 PostgreSQL ciblés PASS, CI backend/portal PASS, audits npm production 0 vulnérabilité. Les commandes d'urgence, Building Bridge et provenances machine restent non activés.

Réserves : scan binaire OS/SBOM externe non exécuté afin d'éviter toute divulgation; il doit être réalisé dans le workflow de registre approuvé. Le DNS/TLS et l'autorité canonique bâtiment restent des gates.
