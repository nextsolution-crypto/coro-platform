const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding bibliothèque CORO...');

  // ============================================================
  // CODES INCIDENTS OFFICIELS
  // ============================================================

  const incidentCodes = [
    { code: 'CODE_ROUGE',     name: 'Code Rouge',     color: '#C0392B', description: 'Incendie' },
    { code: 'CODE_VERT',      name: 'Code Vert',      color: '#27AE60', description: 'Évacuation générale' },
    { code: 'CODE_BLEU',      name: 'Code Bleu',      color: '#2980B9', description: 'Urgence médicale' },
    { code: 'CODE_GRIS',      name: 'Code Gris',      color: '#7F8C8D', description: 'Fuite de gaz' },
    { code: 'CODE_BLANC',     name: 'Code Blanc',     color: '#ECF0F1', description: 'Individu violent / menace' },
    { code: 'CODE_NOIR',      name: 'Code Noir',      color: '#2C3E50', description: 'Bombe / colis suspect' },
    { code: 'CODE_ORANGE',    name: 'Code Orange',    color: '#E67E22', description: 'Panne de courant' },
    { code: 'CODE_JAUNE',     name: 'Code Jaune',     color: '#F1C40F', description: 'Personne manquante' },
    { code: 'CODE_BRUN',      name: 'Code Brun',      color: '#8B4513', description: 'Déversement matières dangereuses' },
    { code: 'CODE_TURQUOISE', name: 'Code Turquoise', color: '#1ABC9C', description: 'Inondation / dégât eau' },
    { code: 'CODE_GRENAT',    name: 'Code Grenat',    color: '#8B0000', description: 'Batterie lithium-ion' },
    { code: 'CODE_ROSE',      name: 'Code Rose',      color: '#E91E63', description: 'Enlèvement / fugue' },
    { code: 'CODE_VIOLET',    name: 'Code Violet',    color: '#8E44AD', description: 'Confinement / menace externe' },
    { code: 'CODE_ARGENT',    name: 'Code Argent',    color: '#95A5A6', description: 'Séisme / désastre naturel' },
    { code: 'PROTOCOLE_18',   name: 'Protocole-18',   color: '#4B0082', description: 'Situation sensible / médiatique' },
    { code: 'ALERTE_INCENDIE',name: 'Alerte incendie',color: '#FF6600', description: 'Phase alerte (double signal)' },
    { code: 'ALARME_INCENDIE',name: 'Alarme incendie',color: '#FF0000', description: 'Phase alarme générale' },
    { code: 'CODE_TEAL', name: 'Code Teal', color: '#008B8B', description: 'Personne coincée dans un ascenseur' },
  ];

  for (const code of incidentCodes) {
    await prisma.incidentCode.upsert({
      where: { code: code.code },
      update: { name: code.name, color: code.color, description: code.description },
      create: code,
    });
  }
  console.log(`✅ Codes incidents: ${incidentCodes.length}`);

  // ============================================================
  // RÔLES OFFICIELS CORO
  // Enrichis selon gabarits GardaWorld et exemples clients réels
  // ============================================================

  const roles = [
    // ── Commandement principal ──────────────────────────────
    {
      roleCode: 'ROLE-CU',
      name: 'Coordonnateur d\'urgence',
      description: 'Responsable global de la gestion de l\'urgence. Coordonne toutes les opérations, communique avec les services d\'urgence et supervise l\'évacuation.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-COS',
      name: 'Contrôleur COS',
      description: 'Contrôleur des opérations de secours. Supervise les opérations de sécurité lors d\'événements majeurs.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-DG',
      name: 'Directeur général',
      description: 'Responsable ultime de l\'organisation. Impliqué lors d\'urgences majeures.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-DIR-EXP',
      name: 'Directeur Exploitation',
      description: 'Directeur des opérations du bâtiment ou de la succursale.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-DIR-ADJ',
      name: 'Directeur adjoint immobilier',
      description: 'Directeur adjoint responsable des opérations immobilières.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-COORD-EXP',
      name: 'Coordonnatrice principale exploitation',
      description: 'Coordonnatrice principale des opérations du bâtiment.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-COORD-EXP2',
      name: 'Coordonnatrice Exploitation',
      description: 'Coordonnatrice des opérations.',
      isStandard: false,
    },

    // ── Sécurité ────────────────────────────────────────────
    {
      roleCode: 'ROLE-AS',
      name: 'Agent de sécurité',
      description: 'Agent de sécurité présent sur place. Souvent le premier intervenant.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-CHEF-SEC',
      name: 'Chef de la sécurité',
      description: 'Responsable hiérarchique de l\'équipe de sécurité.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-RESP-SEC',
      name: 'Responsable de la sécurité',
      description: 'Responsable sécurité physique et prévention.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-SUP-SEC',
      name: 'Superviseur de la sécurité',
      description: 'Superviseur de l\'équipe de sécurité.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-LIEUT',
      name: 'Lieutenant en devoir',
      description: 'Lieutenant responsable du quart de travail en cours.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-PERS-SUCC',
      name: 'Personnel de la succursale',
      description: 'Ensemble du personnel de la succursale impliqué dans les mesures d\'urgence.',
      isStandard: false,
    },

    // ── Intervention ────────────────────────────────────────
    {
      roleCode: 'ROLE-EPI',
      name: 'Équipe de première intervention (EPI)',
      description: 'Équipe formée (minimum 3 personnes) chargée d\'évaluer la situation lors d\'une alerte incendie.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-ALT',
      name: 'Agent de liaison corporative de crise',
      description: 'Représentant corporatif lors d\'événements majeurs seulement.',
      isStandard: true,
    },

    // ── Mécanique et technique ───────────────────────────────
    {
      roleCode: 'ROLE-RM',
      name: 'Responsable mécanique du bâtiment',
      description: 'Connaît les systèmes techniques du bâtiment. Appuie les services d\'urgence.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-AGT-ENT',
      name: 'Agent entretien mécanique',
      description: 'Technicien d\'entretien mécanique du bâtiment.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-CHEF-EQ',
      name: 'Chef d\'équipe services généraux',
      description: 'Chef d\'équipe responsable des services généraux et de l\'entretien.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-CHEF-ENT',
      name: 'Chef d\'équipe entretien ménager',
      description: 'Chef d\'équipe entretien ménager.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-PREP-H',
      name: 'Préposé à l\'entretien – Homme',
      description: 'Préposé à l\'entretien ménager.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-PREP-F',
      name: 'Préposé à l\'entretien – Femme',
      description: 'Préposée à l\'entretien ménager.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-TECH-ARCH',
      name: 'Technicien architecture',
      description: 'Technicien responsable des aspects architecturaux du bâtiment.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-TECH-EXP1',
      name: 'Technicien d\'exploitation 1',
      description: 'Technicien d\'exploitation du bâtiment.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-TECH-EXP2',
      name: 'Technicien d\'exploitation 2 et Technicien des lumières',
      description: 'Technicien d\'exploitation et éclairage.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-CORPS-MET',
      name: 'Corps de métiers (mécanicien, électricien et plombier)',
      description: 'Corps de métiers techniques du bâtiment.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-CORPS-VENT',
      name: 'Corps de métiers – Ventilation et machinerie fixe',
      description: 'Techniciens de ventilation 1 et 2 et mécanicien de machinerie fixe.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-CHEF-TEC',
      name: 'Chef d\'équipe technique',
      description: 'Chef d\'équipe technique du bâtiment.',
      isStandard: false,
    },

    // ── Évacuation ───────────────────────────────────────────
    {
      roleCode: 'ROLE-RPR',
      name: 'Responsable du point de rassemblement',
      description: 'Supervise la sécurité et le décompte des occupants au point de rassemblement.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-SS',
      name: 'Surveillant de sortie',
      description: 'Positionné à une sortie pour faciliter et sécuriser le passage des occupants.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-BRI',
      name: 'Brigadier',
      description: 'Oriente les occupants vers le point de rassemblement.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-RS',
      name: 'Responsable de secteur',
      description: 'Responsable de l\'évacuation d\'un secteur précis. Rapporte au coordonnateur.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-CHE',
      name: 'Chercheur',
      description: 'Vérifie qu\'aucune personne ne reste dans une zone lors de l\'évacuation.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-ACC',
      name: 'Accompagnateur PPNAE',
      description: 'Accompagne les personnes nécessitant de l\'aide à l\'évacuation.',
      isStandard: true,
    },
    {
      roleCode: 'ROLE-MON-PPNAE',
      name: 'Moniteur pour personne ayant besoin d\'assistance à l\'évacuation',
      description: 'Moniteur désigné pour l\'assistance à l\'évacuation.',
      isStandard: false,
    },

    // ── Administration et support ────────────────────────────
    {
      roleCode: 'ROLE-COORD-SC',
      name: 'Coordonnatrice Service clientèle',
      description: 'Coordonnatrice du service clientèle.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-ADJ-ADM',
      name: 'Adjointe administrative',
      description: 'Support administratif lors d\'urgences.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-SUP',
      name: 'Superviseur',
      description: 'Superviseur général.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-AGT-SUP',
      name: 'Agent de support',
      description: 'Agent de support aux opérations d\'urgence.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-RC',
      name: 'Responsable continuité',
      description: 'Responsable du plan de continuité des affaires.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-RTI',
      name: 'Responsable TI',
      description: 'Responsable des technologies de l\'information.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-ENV',
      name: 'Responsable environnement',
      description: 'Responsable des aspects environnementaux.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-RH',
      name: 'Responsable ressources humaines',
      description: 'Responsable RH lors d\'urgences impliquant le personnel.',
      isStandard: false,
    },
    {
      roleCode: 'ROLE-COMM',
      name: 'Responsable communications',
      description: 'Responsable des communications internes et externes lors d\'urgence.',
      isStandard: false,
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { roleCode: role.roleCode },
      update: { name: role.name, description: role.description },
      create: { ...role, isActive: true },
    });
  }
  console.log(`✅ Rôles créés: ${roles.length}`);

  console.log('🎉 Bibliothèque CORO prête !');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());