// Adresse réelle des visiteurs derrière Nginx (hôte) puis docker-proxy.
//
// Sans ce réglage, Express voit toujours l'adresse locale du proxy : toutes
// les limites de débit (connexion, MFA, codes Population, assistant public)
// deviennent communes à l'ensemble des utilisateurs.
//
// Seuls les sauts locaux sont crus (boucle locale et réseaux privés Docker).
// Une adresse fournie par le client dans X-Forwarded-For, à gauche de celle
// ajoutée par Nginx, n'est donc jamais retenue.
export const TRUSTED_PROXY_SUBNETS = ['loopback', 'uniquelocal'] as const;

export function configureTrustedProxies(expressApp: {
  set: (setting: string, value: unknown) => unknown;
}) {
  expressApp.set('trust proxy', [...TRUSTED_PROXY_SUBNETS]);
}
