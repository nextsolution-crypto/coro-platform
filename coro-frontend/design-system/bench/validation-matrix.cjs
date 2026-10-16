#!/usr/bin/env node
/**
 * Matrice de validation du Lot 1 pour la préproduction — SOURCE UNIQUE (le tableau de design-system/PREPROD.md en est généré :
 * `node design-system/bench/validation-matrix.cjs --markdown`, et bench/preprod.test.cjs vérifie que le document ne dérive pas).
 *
 * mode : « auto » = exécuté par un script du dépôt ; « manuel » = à faire et à consigner par une personne ; « mixte » = les deux.
 * Rôles : C = CONSEILLER, A = ADMIN, S = SUPER_ADMIN.
 * Routes : P = /settings, T = /activities/portfolio, R = /profile/rendement, E = /dashboard/rendement.
 */
const ROUTE_NAMES = { P: '/settings', T: '/activities/portfolio', R: '/profile/rendement', E: '/dashboard/rendement' };

const MATRIX = [
  // ── Permissions et accès direct ──
  { id: 'M-01', domain: 'Permissions', check: 'GET /rendement sans jeton ou avec un jeton invalide est refusé (401/403)', roles: '—', routes: 'E R', mode: 'auto', tool: 'preprod-permissions : PERM-API-01, 02', criterion: 'Aucune donnée renvoyée' },
  { id: 'M-02', domain: 'Permissions', check: 'Un CONSEILLER ne reçoit que ses propres données, avec ou sans userId, y compris le userId d’un autre utilisateur', roles: 'C', routes: 'E R', mode: 'auto', tool: 'preprod-permissions : PERM-API-03, 04, 05', criterion: '0 conseiller étranger dans la réponse' },
  { id: 'M-03', domain: 'Permissions', check: 'ADMIN et SUPER_ADMIN obtiennent l’équipe ; le filtre userId se limite à l’utilisateur demandé ; teamStats = somme des conseillers', roles: 'A S', routes: 'E', mode: 'auto', tool: 'preprod-permissions : PERM-API-06 à 09', criterion: 'Réponse cohérente, filtre respecté' },
  { id: 'M-04', domain: 'Permissions', check: 'Cloisonnement : un ADMIN ne voit aucune donnée d’une autre organisation (userId d’un utilisateur d’une autre organisation de test)', roles: 'A', routes: 'E', mode: 'auto', tool: 'preprod-permissions : PERM-API-10 (PREPROD_OTHER_ORG_USER_ID)', criterion: '0 conseiller ou 403' },
  { id: 'M-05', domain: 'Permissions', check: 'Inventaire des champs renvoyés à un CONSEILLER mais jamais affichés (p. ex. taux horaire)', roles: 'C', routes: 'E R', mode: 'auto', tool: 'preprod-permissions : PERM-API-11 (information)', criterion: 'Liste transmise au propriétaire du backend' },
  { id: 'M-06', domain: 'Accès direct', check: 'Accès direct (URL saisie) aux quatre routes pour chaque rôle : page atteinte ou redirection attendue', roles: 'C A S', routes: 'P T R E', mode: 'auto', tool: 'preprod-permissions --browser : PERM-BRW-01', criterion: 'Aucune route inattendue ; cas CONSEILLER sur E décidé (M-07)' },
  { id: 'M-07', domain: 'Accès direct', check: 'Décision : /dashboard/rendement pour un non-administrateur — autorisé avec ses seules données (comportement actuel) ou bloqué ? Si autorisé, le périmètre visible doit être ≤ 1 conseiller', roles: 'C', routes: 'E', mode: 'mixte', tool: 'PERM-BRW-03 + décision du propriétaire produit', criterion: 'Décision écrite avant GA' },
  { id: 'M-08', domain: 'Navigation', check: 'Le lien « Rendement équipe » du menu n’apparaît que pour ADMIN et SUPER_ADMIN', roles: 'C A S', routes: 'P', mode: 'auto', tool: 'preprod-permissions --browser : PERM-BRW-05', criterion: 'Présent pour A et S, absent pour C' },
  { id: 'M-09', domain: 'Accès direct', check: '/settings : les sections d’administration (Organisation, Membres…) n’apparaissent que pour ADMIN et SUPER_ADMIN', roles: 'C A S', routes: 'P', mode: 'auto', tool: 'preprod-permissions --browser : PERM-BRW-04', criterion: 'Sections conformes au rôle' },
  { id: 'M-10', domain: 'Permissions', check: 'Rôle falsifié côté navigateur (valeur de coro_user modifiée dans le stockage) : le backend refuse toute action ou donnée réservée', roles: 'C', routes: 'P E', mode: 'manuel', tool: 'DevTools + journal serveur', criterion: 'Aucune donnée ni action administrateur obtenue' },
  { id: 'M-11', domain: 'Permissions', check: 'Session expirée, déconnexion et jeton révoqué pendant la navigation : retour à la connexion, aucune donnée financière résiduelle à l’écran', roles: 'C A S', routes: 'P T R E', mode: 'manuel', tool: 'Parcours guidé', criterion: 'Redirection propre, écran vidé' },
  // ── Données financières ──
  { id: 'M-12', domain: 'Données financières', check: 'Mêmes valeurs en Legacy et en Glass sur des données de préproduction (heures, revenus, budget, montant vendu, coût réel, marge, nombre de déficits)', roles: 'A S', routes: 'R E', mode: 'manuel', tool: 'Comparaison côte à côte (préférence Legacy puis Glass)', criterion: 'Valeurs identiques, toutes périodes' },
  { id: 'M-13', domain: 'Données financières', check: 'Valeurs indisponibles « — » neutres en Glass ; marges positive/négative ; montant vendu = 0 ; budget absent', roles: 'A S', routes: 'R E', mode: 'mixte', tool: 'campaign scenarios (jeu fictif) + contrôle sur données de préproduction', criterion: 'Teintes conformes, formats inchangés' },
  { id: 'M-14', domain: 'Données financières', check: 'Aucune donnée financière dans le stockage du navigateur, l’URL ou les requêtes supplémentaires introduites par la vue Glass', roles: 'A', routes: 'R E', mode: 'mixte', tool: 'Contrats statiques (auto) + onglet Réseau et Application des DevTools (manuel)', criterion: 'Mêmes requêtes qu’en Legacy, aucun stockage' },
  { id: 'M-15', domain: 'Données financières', check: 'Noms très longs, accents, caractères spéciaux (conseillers, clients, mandats) : aucun débordement ni troncature trompeuse', roles: 'A', routes: 'T R E', mode: 'mixte', tool: 'Scénarios (jeu fictif) + données de préproduction', criterion: 'Lisible aux 4 largeurs' },
  // ── Navigation ──
  { id: 'M-16', domain: 'Navigation', check: 'Ouverture d’un mandat ou d’un projet par clic, Entrée et Espace ; retour arrière du navigateur', roles: 'C A S', routes: 'T R E', mode: 'mixte', tool: 'campaign scenarios (kbopen-*) + parcours réel', criterion: '1 clic = 1 navigation, bonne destination' },
  { id: 'M-17', domain: 'Navigation', check: 'Téléchargement .ics avec un vrai jeton (fichier valide, nom, contenu)', roles: 'C A', routes: 'T', mode: 'manuel', tool: 'Parcours réel', criterion: 'Fichier calendrier valide' },
  { id: 'M-18', domain: 'Navigation', check: 'Navigation entre les pages du Lot 1 et le reste de l’application, en Legacy comme en Glass, sans erreur ni boucle de redirection', roles: 'C A S', routes: 'P T R E', mode: 'manuel', tool: 'Parcours guidé', criterion: 'Aucune erreur visible ni exception' },
  // ── Périodes ──
  { id: 'M-19', domain: 'Périodes', check: 'Ce mois / Cette année / Personnalisé avec données réelles ; période vide ; plage inversée (Du > Au) ; mêmes résultats que le Legacy', roles: 'A S', routes: 'R E', mode: 'mixte', tool: 'campaign scenarios (jeu fictif) + comparaison sur données de préproduction', criterion: 'Résultats identiques au Legacy' },
  { id: 'M-20', domain: 'Périodes', check: 'Bornes de période : entrées du dernier jour du mois, minuit, changement de fuseau — observation et transmission au propriétaire du backend (non corrigé ici)', roles: 'A', routes: 'R E', mode: 'manuel', tool: 'Saisies de test aux bornes', criterion: 'Constat consigné' },
  // ── Tableaux ──
  { id: 'M-21', domain: 'Tableaux', check: 'Volume réaliste (≥ 100 activités, ≥ 10 conseillers) : ordre, lisibilité, temps de rendu comparable au Legacy', roles: 'A', routes: 'T E', mode: 'manuel', tool: 'Données de préproduction volumineuses', criterion: 'Pas de ralentissement visible' },
  { id: 'M-22', domain: 'Tableaux', check: 'Bascule cartes mobiles / tableau à 768 px ; défilement horizontal interne du tableau', roles: 'A', routes: 'T R E', mode: 'mixte', tool: 'campaign scenarios (tablet768, mobile*) + appareil réel', criterion: 'Aucun défilement de la page' },
  // ── Responsive ──
  { id: 'M-23', domain: 'Responsive', check: 'Aucun débordement horizontal de la page à 320, 390, 768 et 1600 px, pour chaque rôle', roles: 'C A S', routes: 'P T R E', mode: 'auto', tool: 'preprod-permissions --browser : PERM-BRW-07', criterion: '0 débordement' },
  { id: 'M-24', domain: 'Responsive', check: 'Appareils réels : iOS Safari et Android Chrome (barre d’URL dynamique, clavier virtuel, zones sûres, tactile)', roles: 'A', routes: 'P T R E', mode: 'manuel', tool: 'Appareils réels', criterion: 'Utilisable sans zoom, cibles ≥ 44 px' },
  // ── Clavier et lecteur d’écran ──
  { id: 'M-25', domain: 'Clavier', check: 'Parcours clavier complet : ordre de Tab, focus visible, Entrée et Espace, Maj+Tab, aucune double action', roles: 'A', routes: 'P T R E', mode: 'auto', tool: 'campaign scenarios (keyboard, kbopen-*, kbperiod)', criterion: 'Tous les scénarios clavier verts' },
  { id: 'M-26', domain: 'Clavier', check: 'Défilement horizontal au clavier des tableaux de rendement à 768 px : flèches, Tab, Fin ; Firefox et Safari en plus de Chrome', roles: 'A', routes: 'R E', mode: 'mixte', tool: 'Mesure Chrome (10A) + Firefox/Safari manuels', criterion: 'Dernière colonne atteignable au clavier sur les 3 moteurs, ou correctif décidé' },
  { id: 'M-27', domain: 'Lecteur d’écran', check: 'NVDA (Windows) avec Firefox et Chrome : parcours des 4 pages (titres, régions, boutons, états, périodes, tableaux)', roles: 'C A', routes: 'P T R E', mode: 'manuel', tool: 'Script de parcours de PREPROD.md', criterion: 'Chaque action annoncée et réalisable' },
  { id: 'M-28', domain: 'Lecteur d’écran', check: 'VoiceOver (macOS Safari et iOS Safari) : mêmes parcours', roles: 'C A', routes: 'P T R E', mode: 'manuel', tool: 'Script de parcours de PREPROD.md', criterion: 'Chaque action annoncée et réalisable' },
  { id: 'M-29', domain: 'Lecteur d’écran', check: 'Zoom 200 % et 400 %, taille de texte agrandie, contraste élevé (forced-colors), mouvement réduit, transparence réduite', roles: 'A', routes: 'P T R E', mode: 'manuel', tool: 'Réglages système et navigateur', criterion: 'Aucune perte d’information ni d’action' },
  // ── Bêta et production ──
  { id: 'M-30', domain: 'Bêta', check: 'Build SANS jeton (et avec NEXT_PUBLIC_GLASS_BETA=1) : les quatre routes restent en îlot Legacy, même avec la préférence Glass et la clé locale de bêta', roles: '—', routes: 'P T R E', mode: 'auto', tool: 'preprod-build-check (variantes off, accidental)', criterion: '4 routes en Legacy' },
  { id: 'M-31', domain: 'Bêta', check: 'Build avec NEXT_PUBLIC_GLASS_BETA=production-preview : les quatre routes en Glass pour la préférence Glass, en Legacy pour la préférence Legacy ; les autres routes inchangées', roles: '—', routes: 'P T R E', mode: 'auto', tool: 'preprod-build-check (variante on)', criterion: 'Moteur conforme à la préférence' },
  { id: 'M-32', domain: 'Production', check: 'Aucun outil de développement exposé : /glass-kit en 404, aucun banc, faux API, test ou terrain d’essai dans le build', roles: '—', routes: '—', mode: 'auto', tool: 'glass:verify-production et preprod-build-check', criterion: '32/32 contrôles par build' },
  { id: 'M-33', domain: 'Production', check: 'Revue de la configuration de déploiement : le jeton de bêta n’est défini que dans l’environnement de préproduction prévu', roles: '—', routes: '—', mode: 'manuel', tool: 'Revue CI/CD et variables d’environnement (sans les afficher)', criterion: 'Jeton absent de la production' },
  // ── Retour arrière et erreurs ──
  { id: 'M-34', domain: 'Retour arrière', check: 'Retirer le jeton et reconstruire : les quatre routes repassent en Legacy sans perte de données ; la préférence d’interface de l’utilisateur n’est qu’un réglage local', roles: 'A', routes: 'P T R E', mode: 'mixte', tool: 'preprod-build-check (off) + répétition en préproduction', criterion: 'Legacy rétabli, données intactes' },
  { id: 'M-35', domain: 'États', check: 'Chargement, vide et erreur avec le vrai backend : erreur 500, délai, 401 expiré, réponse vide', roles: 'A', routes: 'T R E', mode: 'mixte', tool: 'campaign scenarios (jeu fictif) + simulation d’incident en préproduction', criterion: 'Comportement identique au Legacy' },
  { id: 'M-36', domain: 'Observabilité', check: 'Journaux serveur et navigateur pendant les parcours : aucune erreur 4xx/5xx nouvelle, aucune exception JavaScript', roles: 'C A S', routes: 'P T R E', mode: 'mixte', tool: 'PERM-BRW-06 + journaux serveur', criterion: '0 nouvelle erreur' },
];

function toMarkdown() {
  const head = '| ID | Domaine | Vérification | Rôles | Routes | Mode | Outil | Critère |\n|---|---|---|---|---|---|---|---|';
  return [head, ...MATRIX.map((m) => `| ${m.id} | ${m.domain} | ${m.check} | ${m.roles} | ${m.routes} | ${m.mode} | ${m.tool} | ${m.criterion} |`)].join('\n');
}

module.exports = { MATRIX, ROUTE_NAMES, toMarkdown };
if (require.main === module) console.log(process.argv.includes('--markdown') ? toMarkdown() : JSON.stringify(MATRIX, null, 2));
