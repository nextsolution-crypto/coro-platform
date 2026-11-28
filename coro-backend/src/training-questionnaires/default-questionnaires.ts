/**
 * Questionnaires post-formation CORO par défaut, par type d'activité de
 * formation. Chaque organisation peut les remplacer par les siens
 * (Paramètres → Questionnaires de formation). Les questions restent
 * générales : elles complètent, sans le remplacer, le contenu propre à
 * chaque bâtiment (PMU, procédures).
 */
export type QuestionnaireQuestion = {
  id: string;
  text: string;
  choices: string[];
  correct: number;
};

export type DefaultQuestionnaire = {
  title: string;
  passingPercent: number;
  questions: QuestionnaireQuestion[];
};

const q = (id: string, text: string, choices: string[], correct: number): QuestionnaireQuestion => ({
  id,
  text,
  choices,
  correct,
});

const EQUIPE_URGENCE: DefaultQuestionnaire = {
  title: 'Questionnaire — Formation pour équipe d’urgence',
  passingPercent: 80,
  questions: [
    q('eu1', 'À l’alarme générale (évacuation), quel moyen utilisez-vous pour quitter l’étage ?', [
      'L’ascenseur le plus proche',
      'L’escalier d’issue le plus proche',
      'L’ascenseur de service',
      'J’attends les consignes à mon poste',
    ], 1),
    q('eu2', 'Dans un système à double signal, que signifie le premier signal (alerte) ?', [
      'Tout le monde évacue immédiatement',
      'L’équipe d’urgence vérifie la situation et se prépare ; les occupants restent attentifs',
      'Il s’agit toujours d’un essai',
      'Seuls les visiteurs doivent sortir',
    ], 1),
    q('eu3', 'Avant d’ouvrir une porte pendant un incendie, vous constatez qu’elle est chaude. Que faites-vous ?', [
      'Je l’ouvre rapidement pour passer',
      'Je ne l’ouvre pas et j’utilise une autre sortie',
      'Je l’ouvre en me protégeant le visage',
      'Je la bloque ouverte pour aérer',
    ], 1),
    q('eu4', 'Quel est le rôle du « chercheur » lors d’une évacuation ?', [
      'Appeler les médias',
      'Vérifier qu’aucune personne ne reste dans son secteur',
      'Couper l’électricité du bâtiment',
      'Accueillir les pompiers à l’entrée',
    ], 1),
    q('eu5', 'Une personne à mobilité réduite ne peut pas descendre l’escalier. Quelle est la bonne pratique ?', [
      'La laisser à son bureau, porte fermée, sans rien dire',
      'Utiliser l’ascenseur malgré l’alarme',
      'L’accompagner au lieu de refuge prévu et signaler sa position au coordonnateur et aux pompiers',
      'La porter dans l’escalier en tout temps',
    ], 2),
    q('eu6', 'Au point de rassemblement, quand peut-on retourner dans le bâtiment ?', [
      'Dès que l’alarme cesse de sonner',
      'Quand les pompiers ou le coordonnateur d’urgence l’autorisent',
      'Après 15 minutes',
      'Quand la majorité des occupants est revenue',
    ], 1),
    q('eu7', 'Quelle séquence décrit l’utilisation d’un extincteur portatif ?', [
      'Viser le haut des flammes, serrer, tirer la goupille',
      'Tirer la goupille, viser la base des flammes, serrer, balayer',
      'Serrer, balayer, puis tirer la goupille',
      'Viser la fumée et vider l’extincteur d’un coup',
    ], 1),
    q('eu8', 'Après avoir découvert de la fumée, quelle est la première action attendue ?', [
      'Terminer sa tâche en cours',
      'Déclencher l’alarme au poste manuel le plus proche et donner l’alerte',
      'Ouvrir les fenêtres de l’étage',
      'Prendre une photo pour le rapport',
    ], 1),
  ],
};

const EPI: DefaultQuestionnaire = {
  title: 'Questionnaire — Équipe de première intervention (EPI)',
  passingPercent: 80,
  questions: [
    q('epi1', 'Combien de personnes compose au minimum une équipe de première intervention ?', ['1', '2', '3', '6'], 2),
    q('epi2', 'Quelle est la mission principale de l’EPI lors d’une alerte incendie ?', [
      'Évacuer d’abord les membres de la direction',
      'Évaluer rapidement la situation et rapporter au coordonnateur d’urgence',
      'Attendre les pompiers au point de rassemblement',
      'Réarmer le panneau d’alarme',
    ], 1),
    q('epi3', 'Quand l’EPI peut-elle tenter d’éteindre un début d’incendie ?', [
      'Toujours, quelle que soit la taille du feu',
      'Seulement si le feu est petit, que la sortie reste derrière soi et que l’équipe est formée',
      'Seulement si les pompiers sont en retard',
      'Jamais',
    ], 1),
    q('epi4', 'Où faut-il viser le jet d’un extincteur ?', [
      'Le haut des flammes',
      'La fumée',
      'La base des flammes',
      'Le plafond',
    ], 2),
    q('epi5', 'Si le feu ne diminue pas après l’utilisation d’un extincteur, que faites-vous ?', [
      'Je prends un deuxième extincteur et je reste seul',
      'Je quitte la pièce, je ferme la porte et je rapporte la situation',
      'J’ouvre les fenêtres pour évacuer la fumée',
      'Je jette de l’eau sur le feu',
    ], 1),
    q('epi6', 'Pourquoi fermer les portes derrière soi en quittant une zone en feu ?', [
      'Pour éviter le vol',
      'Pour ralentir la propagation du feu et de la fumée',
      'Pour réarmer l’alarme',
      'Ce n’est pas nécessaire',
    ], 1),
  ],
};

const COORDONNATEUR: DefaultQuestionnaire = {
  title: 'Questionnaire — Coordonnateurs d’urgence',
  passingPercent: 80,
  questions: [
    q('co1', 'Quel est le rôle principal du coordonnateur d’urgence ?', [
      'Éteindre l’incendie',
      'Coordonner les opérations, communiquer avec les services d’urgence et superviser l’évacuation',
      'Rédiger le PMU',
      'Faire le décompte au point de rassemblement seulement',
    ], 1),
    q('co2', 'À l’arrivée des pompiers, quelle information est prioritaire ?', [
      'Le nombre d’employés dans l’entreprise',
      'L’emplacement de l’incident et des personnes manquantes ou ayant besoin d’assistance',
      'Le nom du gestionnaire de l’immeuble',
      'L’heure de la dernière inspection',
    ], 1),
    q('co3', 'Qui autorise la fin de l’alerte et le retour dans le bâtiment après un incendie ?', [
      'Le premier employé qui revient',
      'Le service de sécurité incendie (pompiers)',
      'Le gestionnaire du locataire',
      'Personne : on revient quand l’alarme s’arrête',
    ], 1),
    q('co4', 'Le coordonnateur titulaire est absent. Que prévoit le plan ?', [
      'Rien : on attend son retour',
      'Un substitut désigné prend le rôle',
      'Le premier occupant qui arrive prend le rôle',
      'Les pompiers coordonnent tout dès l’alerte',
    ], 1),
    q('co5', 'Où le coordonnateur d’urgence s’installe-t-il pendant un événement ?', [
      'À son bureau habituel',
      'Au poste de commandement prévu dans le plan',
      'Dans l’ascenseur',
      'Au stationnement, loin de l’équipe',
    ], 1),
    q('co6', 'Pourquoi tenir une chronologie des actions pendant l’urgence ?', [
      'Ce n’est pas utile',
      'Pour le retour d’expérience et les actions correctives après l’événement',
      'Pour les réseaux sociaux',
      'Seulement si les médias le demandent',
    ], 1),
  ],
};

const LOCATAIRES: DefaultQuestionnaire = {
  title: 'Questionnaire — Formation aux locataires',
  passingPercent: 80,
  questions: [
    q('lo1', 'Combien de sorties devriez-vous connaître depuis votre poste de travail ?', ['Une seule', 'Au moins deux', 'Aucune, je suis les autres', 'Seulement l’entrée principale'], 1),
    q('lo2', 'À l’alarme générale, que faites-vous de vos effets personnels ?', [
      'Je prends le temps de tout ranger',
      'Je pars immédiatement sans retourner les chercher',
      'Je retourne les chercher après être sorti',
      'J’attends la fin de l’alarme',
    ], 1),
    q('lo3', 'Pouvez-vous utiliser l’ascenseur pendant une alarme incendie ?', ['Oui', 'Non', 'Seulement pour descendre', 'Seulement s’il est vide'], 1),
    q('lo4', 'Où vous rendez-vous après être sorti du bâtiment ?', [
      'À ma voiture',
      'Au point de rassemblement indiqué',
      'Au café d’en face',
      'Je rentre chez moi',
    ], 1),
    q('lo5', 'Vous aurez besoin d’aide pour évacuer (mobilité, grossesse, blessure). Que faites-vous ?', [
      'Rien, on s’en occupera le moment venu',
      'Je le signale à l’avance à mon responsable ou au gestionnaire de l’immeuble',
      'J’attends que quelqu’un s’en aperçoive',
      'Je reste à mon bureau pendant les exercices',
    ], 1),
  ],
};

const TRAVAIL_CHAUD: DefaultQuestionnaire = {
  title: 'Questionnaire — Travail à chaud',
  passingPercent: 80,
  questions: [
    q('tc1', 'Que faut-il obtenir avant de commencer un travail à chaud (soudure, meulage, chalumeau) ?', [
      'Rien, si le travail est court',
      'Un permis de travail à chaud signé',
      'Une autorisation verbale du locataire',
      'Un simple courriel au gestionnaire',
    ], 1),
    q('tc2', 'Que faire des matières combustibles autour de la zone de travail ?', [
      'Les laisser en place',
      'Les éloigner ou les protéger par une couverture ignifuge dans le rayon prévu au permis',
      'Les arroser légèrement',
      'Les couvrir d’une bâche en plastique',
    ], 1),
    q('tc3', 'Qui assure la surveillance incendie pendant les travaux ?', [
      'Personne',
      'Un surveillant désigné, muni d’un extincteur',
      'Le détecteur de fumée',
      'Les occupants de l’étage',
    ], 1),
    q('tc4', 'Après la fin des travaux à chaud, la surveillance incendie doit se poursuivre :', [
      'Elle s’arrête à la fin des travaux',
      'Pendant la durée prévue au permis (au moins 30 minutes)',
      'Pendant 5 minutes',
      'Seulement si on sent de la fumée',
    ], 1),
    q('tc5', 'Peut-on désactiver un détecteur ou une zone d’alarme pour éviter une fausse alarme ?', [
      'Oui, librement',
      'Seulement selon la procédure de mise hors service autorisée, avec surveillance compensatoire',
      'Oui, en couvrant le détecteur avec du ruban',
      'Oui, si le travail dure moins d’une heure',
    ], 1),
  ],
};

const SST_BATIMENT_OCCUPE: DefaultQuestionnaire = {
  title: 'Questionnaire — SST : travaux en bâtiment occupé',
  passingPercent: 80,
  questions: [
    q('sst1', 'Pendant des travaux dans un bâtiment occupé, les issues et corridors d’évacuation doivent :', [
      'Servir d’entreposage temporaire',
      'Rester libres et accessibles en tout temps',
      'Être fermés pendant les travaux',
      'Être utilisés seulement par les travailleurs',
    ], 1),
    q('sst2', 'Avant d’intervenir sur un équipement (électrique, mécanique), que faut-il appliquer ?', [
      'Rien si l’intervention est rapide',
      'La procédure de cadenassage',
      'Un simple avis verbal',
      'Une affiche « Ne pas toucher »',
    ], 1),
    q('sst3', 'Où trouvez-vous les renseignements sur les dangers d’un produit chimique utilisé sur le chantier ?', [
      'Sur internet',
      'Dans la fiche de données de sécurité (SIMDUT)',
      'Auprès d’un occupant',
      'Il n’y en a pas pour les produits courants',
    ], 1),
    q('sst4', 'Comment protéger les occupants autour d’une zone de travaux ?', [
      'Ce n’est pas la responsabilité de l’entrepreneur',
      'Délimiter et signaliser la zone, contrôler la poussière et le bruit, informer les occupants',
      'Travailler plus vite',
      'Faire les travaux pendant les heures de pointe',
    ], 1),
    q('sst5', 'L’alarme incendie sonne pendant vos travaux. Que faites-vous ?', [
      'Je termine ma tâche',
      'Je sécurise rapidement mon équipement (arrêt, pas de flamme laissée) et j’évacue selon le plan du bâtiment',
      'Je reste sur place, c’est sûrement un essai',
      'J’utilise l’ascenseur de service',
    ], 1),
    q('sst6', 'Un détecteur, un gicleur ou une porte coupe-feu gêne vos travaux. Que faites-vous ?', [
      'Je le neutralise moi-même',
      'J’en avise le responsable du bâtiment : seule une mise hors service autorisée est permise',
      'Je cale la porte coupe-feu ouverte',
      'Je couvre le gicleur',
    ], 1),
    q('sst7', 'À qui signalez-vous un incident ou un accident évité de justesse sur le chantier ?', [
      'À personne s’il n’y a pas de blessé',
      'À mon superviseur et au responsable du bâtiment, sans délai',
      'Seulement à mes collègues',
      'À la fin de la semaine',
    ], 1),
    q('sst8', 'Pourquoi connaître le point de rassemblement du bâtiment où vous travaillez ?', [
      'Ce n’est pas nécessaire pour un sous-traitant',
      'Pour être compté lors d’une évacuation et ne pas être recherché inutilement',
      'Pour y prendre ses pauses',
      'Pour y garer son véhicule',
    ], 1),
  ],
};

const COMMUNICATION: DefaultQuestionnaire = {
  title: 'Questionnaire — Communication d’urgence',
  passingPercent: 80,
  questions: [
    q('cm1', 'À la radio, un message d’urgence doit être :', [
      'Long et détaillé',
      'Court, clair, avec le code, le lieu et l’action demandée',
      'Envoyé à plusieurs personnes en même temps sans attendre de réponse',
      'Répété sans pause',
    ], 1),
    q('cm2', 'Pourquoi utiliser des codes couleur dans les annonces radio ?', [
      'Pour que personne ne comprenne',
      'Pour transmettre rapidement le type d’urgence sans semer la panique',
      'Parce que c’est plus court à écrire',
      'Uniquement pour les exercices',
    ], 1),
    q('cm3', 'Après avoir reçu une consigne, que faites-vous ?', [
      'Rien',
      'Je confirme la réception, puis je rapporte quand l’action est faite',
      'J’attends qu’on me rappelle',
      'Je transmets la consigne à quelqu’un d’autre',
    ], 1),
    q('cm4', 'Un journaliste vous pose des questions pendant l’événement. Que faites-vous ?', [
      'Je réponds ce que je sais',
      'Je le dirige poliment vers le porte-parole désigné',
      'Je donne mon avis sur la cause',
      'Je refuse sèchement',
    ], 1),
  ],
};

const COMPORTEMENT: DefaultQuestionnaire = {
  title: 'Questionnaire — Comportement en situation d’urgence',
  passingPercent: 80,
  questions: [
    q('cp1', 'Quelle attitude adopter pour aider les autres pendant une évacuation ?', [
      'Courir pour sortir le premier',
      'Rester calme, parler clairement et suivre les consignes',
      'Crier pour attirer l’attention',
      'Filmer la scène',
    ], 1),
    q('cp2', 'Une personne panique et refuse d’avancer. Que faites-vous ?', [
      'Je la laisse sur place',
      'Je la rassure brièvement, je lui donne une consigne simple et j’alerte l’équipe d’urgence si nécessaire',
      'Je la pousse',
      'Je reste avec elle sans prévenir personne',
    ], 1),
    q('cp3', 'Pourquoi ne pas propager des rumeurs pendant un événement ?', [
      'Ce n’est pas grave',
      'Elles créent de la confusion et peuvent mettre des personnes en danger',
      'Elles aident les pompiers',
      'Elles rassurent les occupants',
    ], 1),
  ],
};

export const DEFAULT_QUESTIONNAIRES: Record<string, DefaultQuestionnaire> = {
  formation_equipe_urgence: EQUIPE_URGENCE,
  formation_equipe_urgence_exercice: EQUIPE_URGENCE,
  formation_epi: EPI,
  formation_coordonnateur: COORDONNATEUR,
  formation_locataires: LOCATAIRES,
  formation_travail_chaud: TRAVAIL_CHAUD,
  formation_sst_batiment_occupe: SST_BATIMENT_OCCUPE,
  formation_communication: COMMUNICATION,
  formation_comportement: COMPORTEMENT,
};

/** Une activité de formation est rattachable à un questionnaire. */
export const isTrainingType = (code: string | null | undefined) =>
  Boolean(code && (code.startsWith('formation') || DEFAULT_QUESTIONNAIRES[code]));
