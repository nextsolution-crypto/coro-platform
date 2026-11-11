# DISPLAY-06A — Identité d'appareil

L'appareil utilise un identifiant opaque distinct de tout `ClientUser`, lié à une organisation, un bâtiment, un emplacement et un profil. Une identité future contient un secret ou certificat unique conservé par le stockage protégé de l'OS, jamais une clé partagée globale.

DISPLAY-06B devra fournir : enrôlement à usage unique, attestation locale, rotation, révocation, récupération contrôlée et permissions de lecture minimales. DISPLAY-06A ne crée ni secret réel ni endpoint d'enrôlement.
