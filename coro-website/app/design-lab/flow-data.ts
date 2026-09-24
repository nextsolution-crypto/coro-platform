/** Committed assets only. Study D bridges LAB-05 (operational UI) and LAB-06 (learning) with a real command-room photograph. */
export const flowAsset = { command: { src: '/website-v2/incident/incident-command.webp', ratio: 1536 / 1024 } } as const;

const fr = {
  zone: {
    title: 'Continuum et flux',
    principles: ['Le continuum n’est pas une liste de fonctionnalités.', 'L’action produit des preuves. Les preuves produisent de l’apprentissage.'],
    lead: 'Comment l’information devient action, et comment l’action devient apprentissage. Un système de relations, pas une animation : le sens est entièrement statique.',
    demo: 'Contenu de laboratoire, explicatif et de démonstration : aucune donnée réelle, aucun calcul réglementaire, aucun lien avec les modules du produit.',
    open: 'Vue isolée',
    studies: { a: 'A — Continuum CORO', b: 'B — Données → action', c: 'C — Processus opérationnel', d: 'D — Scénario et rétroaction' },
    leads: {
      a: 'Neuf étapes, un seul système. La masse et l’échelle suivent l’intensité opérationnelle ; la boucle d’amélioration revient au début.',
      b: 'Le mécanisme CORO en quatre temps, sous forme compacte et réutilisable.',
      c: 'Un processus borné : chronologie, décision, production de chaque étape.',
      d: 'Du signal à l’apprentissage : une situation réelle, une décision, ses preuves.',
    },
    primitives: [
      ['Continuum', 'Système à neuf étapes et quatre mouvements. Ligne structurelle unique, boucle de retour.'],
      ['DataToActionFlow', 'Quatre temps typographiques sur une même ligne. Signature réutilisable.'],
      ['ProcessFlow', 'Processus borné : décalage, étape, production. Porte de décision.'],
      ['ScenarioFlow', 'Cause, décision, conséquence, avec les options pesées.'],
    ] as const,
    primitivesTitle: 'Primitives', noConnector: 'Pas de FlowConnector autonome : le connecteur est la ligne propre à chaque flux, et un connecteur générique deviendrait un moteur de graphe.',
  },
  continuum: {
    label: 'Continuum CORO en neuf étapes',
    phases: [
      { word: 'CONNAÎTRE', desc: 'Données et connaissance' },
      { word: 'ANTICIPER', desc: 'Risques et préparation' },
      { word: 'DÉTECTER', desc: 'Alertes et événements' },
      { word: 'DÉCIDER', desc: 'Analyse et priorisation' },
      { word: 'AGIR', desc: 'Intervention et coordination' },
      { word: 'PROTÉGER', desc: 'Personnes et actifs' },
      { word: 'PROUVER', desc: 'Traçabilité et rapports' },
      { word: 'APPRENDRE', desc: 'REX et enseignements' },
      { word: 'AMÉLIORER', desc: 'Actions et performance' },
    ],
    movements: [
      { name: 'Comprendre et préparer', intensity: 'Calme · fondation', from: 1, to: 2 },
      { name: 'Percevoir et décider', intensity: 'Attention · l’information devient décision', from: 3, to: 4 },
      { name: 'Répondre et protéger', intensity: 'Intensité opérationnelle élevée', from: 5, to: 6 },
      { name: 'Prouver, apprendre, améliorer', intensity: 'La pression baisse · preuves et apprentissage', from: 7, to: 9 },
    ],
    feedback: { label: 'Boucle d’amélioration', from: '09 Améliorer', to: '01 Connaître · 02 Anticiper', text: 'Ce qui est amélioré enrichit la connaissance et la préparation.' },
  },
  d2a: {
    label: 'Des données à l’amélioration',
    steps: [
      { word: 'DONNÉES', caption: 'Ce que l’organisation sait de ses bâtiments, de ses personnes et de ses risques.', evidence: 'Plans · registres · occupants' },
      { word: 'DÉCISION', caption: 'Des priorités claires au moment où elles comptent.', evidence: 'Analyse · priorisation' },
      { word: 'ACTION', caption: 'Intervention et coordination sur le terrain.', evidence: 'Rôles · consignes · pointage' },
      { word: 'AMÉLIORATION', caption: 'Ce qui a été appris revient dans la connaissance.', evidence: 'REX · actions correctives' },
    ] as const,
    returnNote: 'L’amélioration enrichit les données : le cycle continue.',
  },
  process: {
    label: 'Processus opérationnel : de l’alerte à la clôture',
    demo: 'Démo · décalages de temps illustratifs',
    gate: 'Point de décision', output: 'Sortie',
    steps: [
      { name: 'ALERTE', time: 'T+00:00', text: 'Un événement est signalé.', output: 'Alerte enregistrée' },
      { name: 'VALIDATION', time: 'T+00:02', text: 'Une personne désignée confirme ou écarte l’événement.', output: 'Décision de déclenchement', gate: true },
      { name: 'MOBILISATION', time: 'T+00:04', text: 'Les rôles reçoivent leurs tâches et sont avisés.', output: 'Équipe avisée' },
      { name: 'ACTION', time: 'T+00:10', text: 'Intervention, évacuation et décompte des personnes.', output: 'Situation suivie' },
      { name: 'CLÔTURE', time: 'T+00:45', text: 'Fin d’alerte, retour à la normale, trace conservée.', output: 'Événement documenté' },
    ],
  },
  scenario: {
    label: 'Scénario : du signal à l’apprentissage',
    demo: 'Démo · scénario fictif',
    alt: 'Cellule de coordination : un coordonnateur pointe un plan d’étage devant des écrans, quatre personnes suivent.',
    steps: [
      { label: 'SIGNAL', text: 'Une alarme incendie est signalée à l’étage 04.' },
      { label: 'ÉVALUATION', text: 'L’équipe sur place confirme la source et l’étendue.' },
      { label: 'DÉCISION', text: 'Deux options sont pesées.', options: [{ text: 'Évacuer l’étage', chosen: true, chosenLabel: 'Retenu' }, { text: 'Maintenir en place', chosen: false, chosenLabel: 'Écarté' }] },
      { label: 'RÉPONSE', text: 'Évacuation par étage, décompte au point de rassemblement.' },
      { label: 'RÉSULTAT', text: 'Retour à la normale ; l’événement est documenté.' },
    ] as const,
    afterLabel: 'Après l’événement',
    after: [['07', 'PROUVER', 'Journal horodaté et rapport'], ['08', 'APPRENDRE', 'Retour d’expérience avec l’équipe'], ['09', 'AMÉLIORER', 'Procédure d’évacuation mise à jour']] as const,
    returnNote: '↺ Retour vers 01 Connaître · 02 Anticiper',
  },
} as const;

const en = {
  zone: {
    title: 'Continuum and flows',
    principles: ['The continuum is not a feature list.', 'Action creates evidence. Evidence creates learning.'],
    lead: 'How information becomes action, and how action becomes learning. A system of relationships, not an animation: the meaning is fully static.',
    demo: 'Laboratory content, explanatory and demonstration only: no real data, no regulatory calculation, no link to product modules.',
    open: 'Isolated view',
    studies: { a: 'A — CORO continuum', b: 'B — Data → action', c: 'C — Operational process', d: 'D — Scenario and feedback' },
    leads: {
      a: 'Nine stages, one system. Mass and scale follow operational intensity; the improvement loop returns to the start.',
      b: 'The CORO mechanism in four beats, in a compact and reusable form.',
      c: 'A bounded process: chronology, a decision, what each step produces.',
      d: 'From signal to learning: a real situation, a decision, its evidence.',
    },
    primitives: [
      ['Continuum', 'Nine-stage system in four movements. One structural line and a return loop.'],
      ['DataToActionFlow', 'Four typographic beats on one line. A reusable signature.'],
      ['ProcessFlow', 'Bounded process: offset, step, output. A decision gate.'],
      ['ScenarioFlow', 'Cause, decision, consequence, with the options weighed.'],
    ] as const,
    primitivesTitle: 'Primitives', noConnector: 'No standalone FlowConnector: the connector is each flow’s own line, and a generic connector would become a graph engine.',
  },
  continuum: {
    label: 'CORO continuum in nine stages',
    phases: [
      { word: 'KNOW', desc: 'Data and knowledge' },
      { word: 'ANTICIPATE', desc: 'Risks and preparedness' },
      { word: 'DETECT', desc: 'Alerts and events' },
      { word: 'DECIDE', desc: 'Analysis and prioritization' },
      { word: 'ACT', desc: 'Response and coordination' },
      { word: 'PROTECT', desc: 'People and assets' },
      { word: 'PROVE', desc: 'Traceability and reporting' },
      { word: 'LEARN', desc: 'Lessons learned' },
      { word: 'IMPROVE', desc: 'Actions and performance' },
    ],
    movements: [
      { name: 'Understand and prepare', intensity: 'Calm · foundation', from: 1, to: 2 },
      { name: 'Sense and decide', intensity: 'Attention · information becomes decision', from: 3, to: 4 },
      { name: 'Respond and protect', intensity: 'High operational intensity', from: 5, to: 6 },
      { name: 'Prove, learn, improve', intensity: 'Pressure eases · evidence and learning', from: 7, to: 9 },
    ],
    feedback: { label: 'Improvement loop', from: '09 Improve', to: '01 Know · 02 Anticipate', text: 'What is improved enriches knowledge and preparedness.' },
  },
  d2a: {
    label: 'From data to improvement',
    steps: [
      { word: 'DATA', caption: 'What the organization knows about its buildings, its people and its risks.', evidence: 'Plans · registers · occupants' },
      { word: 'DECISION', caption: 'Clear priorities at the moment they matter.', evidence: 'Analysis · prioritization' },
      { word: 'ACTION', caption: 'Response and coordination in the field.', evidence: 'Roles · instructions · check-in' },
      { word: 'IMPROVEMENT', caption: 'What was learned returns into knowledge.', evidence: 'Lessons learned · corrective actions' },
    ] as const,
    returnNote: 'Improvement enriches the data: the cycle continues.',
  },
  process: {
    label: 'Operational process: from alert to closure',
    demo: 'Demo · illustrative time offsets',
    gate: 'Decision gate', output: 'Output',
    steps: [
      { name: 'ALERT', time: 'T+00:00', text: 'An event is reported.', output: 'Alert recorded' },
      { name: 'VALIDATION', time: 'T+00:02', text: 'A designated person confirms or dismisses the event.', output: 'Activation decision', gate: true },
      { name: 'MOBILIZATION', time: 'T+00:04', text: 'Roles receive their tasks and are notified.', output: 'Team notified' },
      { name: 'ACTION', time: 'T+00:10', text: 'Response, evacuation and people count.', output: 'Situation tracked' },
      { name: 'CLOSURE', time: 'T+00:45', text: 'End of alert, back to normal, record kept.', output: 'Event documented' },
    ],
  },
  scenario: {
    label: 'Scenario: from signal to learning',
    demo: 'Demo · fictional scenario',
    alt: 'Coordination room: a coordinator points to a floor plan in front of screens while four people follow.',
    steps: [
      { label: 'SIGNAL', text: 'A fire alarm is reported on floor 04.' },
      { label: 'ASSESSMENT', text: 'The on-site team confirms the source and extent.' },
      { label: 'DECISION', text: 'Two options are weighed.', options: [{ text: 'Evacuate the floor', chosen: true, chosenLabel: 'Chosen' }, { text: 'Hold in place', chosen: false, chosenLabel: 'Set aside' }] },
      { label: 'RESPONSE', text: 'Floor-by-floor evacuation, count at the assembly point.' },
      { label: 'OUTCOME', text: 'Back to normal; the event is documented.' },
    ] as const,
    afterLabel: 'After the event',
    after: [['07', 'PROVE', 'Time-stamped log and report'], ['08', 'LEARN', 'Debrief with the team'], ['09', 'IMPROVE', 'Evacuation procedure updated']] as const,
    returnNote: '↺ Back to 01 Know · 02 Anticipate',
  },
} as const;

export const flowCopy = { fr, en } as const;
export const flowViewKeys = ['flow-a', 'flow-b', 'flow-c', 'flow-d'] as const;
export type FlowViewKey = (typeof flowViewKeys)[number];
