/** Committed assets only. normal-operations contains baked-in CORO branding and text: a Lab reference asset, never a source of copy. */
export const opsAsset = {
  lobby: { src: '/website-v2/sentinel/building-lobby.webp', ratio: 1536 / 1024 },
  command: { src: '/website-v2/incident/incident-command.webp', ratio: 1536 / 1024 },
  assembly: { src: '/website-v2/sentinel/assembly-point.webp', ratio: 1536 / 1024 },
  recovery: { src: '/website-v2/incident/normal-operations.webp', ratio: 1536 / 1024 },
} as const;

const fr = {
  zone: {
    title: 'Interface opérationnelle',
    principles: ['La situation d’abord. L’interface ensuite.', 'Ne montrer que ce qui change la décision.', 'L’intensité opérationnelle détermine la présence de l’interface.'],
    lead: 'Une couche d’information au service de la situation réelle : le bâtiment, les personnes, le terrain viennent en premier. Ce n’est pas un tableau de bord.',
    demo: 'Toutes les valeurs, heures et libellés sont des données de démonstration : aucune donnée en direct, aucune fonction produit n’est promise.',
    demoTag: 'Démo', open: 'Vue isolée',
    states: 'Vocabulaire d’états', statesLead: 'Chaque état porte un symbole et un mot. La couleur ne fait que le renforcer, et l’état est indépendant du fond : le normal existe sur marine, le critique sur blanc.',
    surfaces: [['Blanc', 'white'], ['Surface douce', 'soft'], ['Marine', 'dark']] as const,
    stateList: [['normal', 'Normal'], ['info', 'Information'], ['attention', 'Attention'], ['critical', 'Critique'], ['complete', 'Terminé']] as const,
    srState: 'Statut :',
    primitives: 'Primitives', primitivesLead: 'Sept primitives. Pas de LiveIndicator : « actif » est un état statique avec un mot, sans pulsation, ni halo, ni boucle.',
    primitiveRows: [
      ['StatusChip', 'État compact : symbole + mot. Contour fin, jamais un aplat.'],
      ['OperationalPanel', 'Plaque structurée, 4 px, filets. Pas une carte de tableau de bord.'],
      ['MetricTile', 'Un seul nombre important. Le nombre domine, le cadre disparaît.'],
      ['Timeline', 'Journal d’incident : heure, événement, état, source.'],
      ['PeopleStatus', 'Décompte des personnes sans photo ni annuaire.'],
      ['ActionItem', 'Ce qui doit arriver ensuite : priorité, action, rôle, statut.'],
      ['DocumentStatus', 'Référence de preuve : code, titre, état.'],
    ] as const,
  },
  common: { panelLabel: 'Situation opérationnelle (démonstration)', actions: 'Prochaines actions', timeline: 'Journal des événements', docs: 'Documents et procédures', people: 'Décompte des personnes', priority: 'Priorité', todo: 'À faire', doing: 'En cours', done: 'Terminé', metrics: 'Indicateurs' },
  a: { name: 'A — Calme / normal', alt: 'Hall d’un immeuble de bureaux : une réceptionniste accueille une visiteuse près des tourniquets.', context: 'Tour Prémont · exploitation normale', status: 'Normal', situation: 'Aucune action requise', support: 'Les accès et les pointages se déroulent normalement.', metric: ['128', 'Occupants présents'], docLabel: 'Procédure de référence', doc: ['PSI', 'Plan de sécurité incendie', 'Approuvé'] },
  b: { name: 'B — Incident actif', alt: 'Cellule de coordination : un coordonnateur pointe un plan d’étage devant des écrans, quatre personnes suivent.', context: 'Tour Prémont · incident', status: 'Incident actif', situation: 'Alarme incendie — étage 04', support: 'Évacuation en cours. Un seul point demande une décision.', metrics: [['03', 'Personnes à vérifier', undefined], ['06:42', 'Écoulé', 'PT6M42S']] as const,
    events: [['09:14', 'Alarme reçue', 'critical', 'Critique', 'Système d’alarme'], ['09:16', 'Équipe d’urgence mobilisée', undefined, undefined, undefined], ['09:21', 'Point de rassemblement actif', 'complete', 'Terminé', undefined], ['09:27', 'Vérification en cours', 'attention', 'Attention', undefined]] as const,
    action: ['Confirmer l’évacuation complète', 'Coordonnateur d’urgence'] },
  c: { name: 'C — Personnes / évacuation', alt: 'Des occupants d’un immeuble se rassemblent au point de rassemblement extérieur, sous la surveillance de deux membres de l’équipe d’urgence.', context: 'Point de rassemblement · évacuation', phase: 'Phase : rassemblement', phaseNote: 'Décompte en cours', people: [['accounted', 'Personnes pointées', 128, 'complete'], ['verify', 'À vérifier', 3, 'attention'], ['team', 'Équipe d’urgence active', 2, 'info']] as const,
    actions: [['Vérifier les 3 personnes non pointées', 'Chef d’étage', 'doing'], ['Transmettre le décompte au coordonnateur', 'Équipe d’urgence', 'todo']] as const },
  d: { name: 'D — Reprise / REX', alt: 'Salle de retour d’expérience : un coordonnateur présente le bilan à son équipe devant un écran.', context: 'Tour Prémont · reprise', status: 'Retour à la normale', situation: 'Bâtiment réintégré', support: 'La reprise ouvre la boucle d’amélioration.', note: 'Média de référence de laboratoire : le texte et l’image de marque incrustés ne sont pas des données CORO.',
    events: [['11:02', 'Bâtiment réintégré', 'complete', 'Terminé'], ['11:40', 'Services rétablis', 'complete', 'Terminé'], ['14:00', 'Retour d’expérience planifié', 'info', 'Planifié']] as const,
    milestones: 'Jalons franchis', next: 'Prochaine amélioration', docLabel: 'Preuve et rapport', doc: ['REX', 'Rapport post-incident', 'attention', 'En rédaction'] as const, action: ['Mettre à jour la procédure d’évacuation', 'Responsable sécurité'] },
} as const;

const en = {
  zone: {
    title: 'Operational UI',
    principles: ['Situation first. Interface second.', 'Show only what changes the decision.', 'Operational intensity determines interface presence.'],
    lead: 'A layer of information in service of the real situation: the building, the people and the field come first. This is not a dashboard.',
    demo: 'All values, times and labels are demonstration data: nothing is live and no product function is promised.',
    demoTag: 'Demo', open: 'Isolated view',
    states: 'State vocabulary', statesLead: 'Every state carries a symbol and a word. Colour only reinforces it, and state is independent of the surface: normal exists on navy, critical on white.',
    surfaces: [['White', 'white'], ['Soft surface', 'soft'], ['Navy', 'dark']] as const,
    stateList: [['normal', 'Normal'], ['info', 'Information'], ['attention', 'Attention'], ['critical', 'Critical'], ['complete', 'Complete']] as const,
    srState: 'Status:',
    primitives: 'Primitives', primitivesLead: 'Seven primitives. No LiveIndicator: “active” is a static state with a word, with no pulse, glow or loop.',
    primitiveRows: [
      ['StatusChip', 'Compact state: symbol + word. Fine outline, never a fill.'],
      ['OperationalPanel', 'Structured plate, 4px, rules. Not a dashboard card.'],
      ['MetricTile', 'One important number. The number dominates, the frame disappears.'],
      ['Timeline', 'Incident log: time, event, state, source.'],
      ['PeopleStatus', 'A count of people without photos or directory chrome.'],
      ['ActionItem', 'What must happen next: priority, action, role, status.'],
      ['DocumentStatus', 'Evidence reference: code, title, state.'],
    ] as const,
  },
  common: { panelLabel: 'Operational situation (demonstration)', actions: 'Next actions', timeline: 'Event log', docs: 'Documents and procedures', people: 'People count', priority: 'Priority', todo: 'To do', doing: 'In progress', done: 'Complete', metrics: 'Indicators' },
  a: { name: 'A — Calm / normal', alt: 'Office building lobby: a receptionist welcomes a visitor near the turnstiles.', context: 'Prémont Tower · normal operations', status: 'Normal', situation: 'No action required', support: 'Access and check-ins are running normally.', metric: ['128', 'Occupants present'], docLabel: 'Reference procedure', doc: ['PSI', 'Fire safety plan', 'Approved'] },
  b: { name: 'B — Active incident', alt: 'Coordination room: a coordinator points to a floor plan in front of screens while four people follow.', context: 'Prémont Tower · incident', status: 'Active incident', situation: 'Fire alarm — floor 04', support: 'Evacuation under way. One item needs a decision.', metrics: [['03', 'People to verify', undefined], ['06:42', 'Elapsed', 'PT6M42S']] as const,
    events: [['09:14', 'Alarm received', 'critical', 'Critical', 'Alarm system'], ['09:16', 'Emergency team mobilized', undefined, undefined, undefined], ['09:21', 'Assembly point active', 'complete', 'Complete', undefined], ['09:27', 'Verification in progress', 'attention', 'Attention', undefined]] as const,
    action: ['Confirm the evacuation is complete', 'Emergency coordinator'] },
  c: { name: 'C — People / evacuation', alt: 'Building occupants gather at the outdoor assembly point while two emergency team members watch over them.', context: 'Assembly point · evacuation', phase: 'Phase: assembly', phaseNote: 'Count in progress', people: [['accounted', 'Accounted for', 128, 'complete'], ['verify', 'To verify', 3, 'attention'], ['team', 'Emergency team active', 2, 'info']] as const,
    actions: [['Verify the 3 people not yet accounted for', 'Floor warden', 'doing'], ['Send the count to the coordinator', 'Emergency team', 'todo']] as const },
  d: { name: 'D — Recovery / REX', alt: 'Debrief room: a coordinator presents the summary to the team in front of a screen.', context: 'Prémont Tower · recovery', status: 'Back to normal', situation: 'Building reoccupied', support: 'Recovery opens the improvement loop.', note: 'Lab reference media: the branding and text baked into the image are not CORO data.',
    events: [['11:02', 'Building reoccupied', 'complete', 'Complete'], ['11:40', 'Services restored', 'complete', 'Complete'], ['14:00', 'Debrief scheduled', 'info', 'Scheduled']] as const,
    milestones: 'Milestones reached', next: 'Next improvement', docLabel: 'Proof and report', doc: ['REX', 'Post-incident report', 'attention', 'In writing'] as const, action: ['Update the evacuation procedure', 'Safety manager'] },
} as const;

export const opsCopy = { fr, en } as const;
export const opsViewKeys = ['operational-a', 'operational-b', 'operational-c', 'operational-d'] as const;
export type OpsViewKey = (typeof opsViewKeys)[number];
