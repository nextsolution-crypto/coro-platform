# DISPLAY-06A — Sécurité du Player

La confiance repose sur une clé publique identifiée et un manifeste Ed25519 canonique. SHA-256 protège l'intégrité du fichier mais ne remplace pas la signature. L'identité, l'organisation, le bâtiment, l'emplacement et le profil doivent tous correspondre.

Protections : anti-rejeu/anti-rollback par séquence croissante, clés avec période d'activation et révocation, fenêtre temporelle contrôlée, rejet de substitution, aucun script distant, aucune authentification administrative, aucun secret dans le cache ou le journal.

CSP cible pour l'enveloppe PWA : `default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; connect-src` limité à l'origine CORO autorisée. Elle sera vérifiée avec le shell kiosque de DISPLAY-06B.
