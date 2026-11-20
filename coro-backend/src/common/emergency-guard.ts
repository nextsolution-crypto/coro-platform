// Garde « urgence en cours » commune à tous les assistants IA de CORO.
//
// Un assistant documentaire ne doit jamais retarder un appel au 911. Quand
// un message décrit une situation d'urgence EN COURS (feu, personne
// inconsciente, odeur de gaz, menace armée, détresse suicidaire), la
// réponse est fixe, bilingue et ne passe par aucun modèle de langage.
//
// Les détections sont volontairement étroites : une question de préparation
// (« comment rédiger une procédure incendie ? ») ne déclenche rien.

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const LIVE_EMERGENCY_PATTERNS: RegExp[] = [
  // Feu / fumée en cours
  /\bau feu\b/,
  /\b(il y a|y a|ya) (un |le )?(feu|incendie|fumee)\b/,
  /\b(ca|ici|tout) (brule|flambe)\b/,
  /\b(le |un )?(feu|incendie) (est )?(en cours|chez nous|dans (le|la|l'|notre|mon|ma))/,
  /\b(il y a|y a|ya) de la fumee\b/,
  /\bthere'?s (a )?(fire|smoke)\b/,
  /\b(building|house|kitchen|room|office) (is )?on fire\b/,
  /\bfire!/,
  // Gaz
  /\b(odeur|sent|ca sent) (de |le )?gaz\b/,
  /\b(smell|smells) (of |like )?gas\b/,
  /\bgas leak (now|here|in)\b/,
  // Personne en détresse médicale
  /\b(il|elle|quelqu'un|une personne|mon collegue|ma collegue) (ne respire plus|respire plus|est inconscient|est inconsciente|s'est effondre|s'est effondree|ne reagit plus)\b/,
  /\b(not breathing|unconscious|collapsed|unresponsive)\b/,
  /\bcrise cardiaque\b/,
  /\bheart attack\b/,
  /\b(il|elle|quelqu'un) (saigne|se vide de son sang) (beaucoup|abondamment)\b/,
  // Menace / violence en cours
  /\b(tireur|tireuse) (actif|active|dans|ici)\b/,
  /\bactive (shooter|threat)\b/,
  /\b(quelqu'un|un homme|une femme|un individu) (a|avec) (une arme|un couteau|un fusil)\b/,
  /\b(someone|a man|a woman|a person) (has|with) a (gun|knife|weapon)\b/,
  /\b(menace|alerte) a la bombe (ici|en cours|maintenant)\b/,
  // Détresse personnelle
  /\b(je veux|je vais|j'ai envie de) (me suicider|mourir|me tuer|en finir)\b/,
  /\b(i want to|i'm going to|i am going to) (kill myself|die|end it)\b/,
  // Appel à l'aide explicite
  /^(a l'aide|au secours|help|help me|aidez[- ]moi)[\s!.]*$/,
  /\b(urgence|emergency) (en cours|maintenant|now|right now)\b/,
];

export function isLiveEmergency(message: string | null | undefined): boolean {
  if (!message) return false;
  const text = normalize(message);
  if (!text) return false;
  return LIVE_EMERGENCY_PATTERNS.some((pattern) => pattern.test(text));
}

export const EMERGENCY_REPLY_FR =
  "URGENCE : composez le 911 maintenant. Si vous êtes en danger, éloignez-vous et mettez-vous en sécurité. Suivez les consignes de votre plan d'urgence et des responsables sur place. Détresse ou idées suicidaires : appelez ou textez le 9-8-8. Cet assistant ne peut pas joindre les secours pour vous.";

export const EMERGENCY_REPLY_EN =
  'EMERGENCY: call 911 now. If you are in danger, move away and get to safety. Follow your emergency plan and the instructions of the people in charge on site. Distress or suicidal thoughts: call or text 9-8-8. This assistant cannot contact emergency services for you.';

export const EMERGENCY_REPLY_BILINGUAL = `${EMERGENCY_REPLY_FR}\n\n${EMERGENCY_REPLY_EN}`;

export function emergencyReply(language?: string | null): string {
  const lang = (language ?? '').toLowerCase();
  if (lang.startsWith('fr')) return EMERGENCY_REPLY_FR;
  if (lang.startsWith('en')) return EMERGENCY_REPLY_EN;
  return EMERGENCY_REPLY_BILINGUAL;
}
