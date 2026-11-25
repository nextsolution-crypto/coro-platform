// ============================================================
// CORO — Style unique des étapes de procédure
// « Vérifier le panneau » → « **Vérifiez** le panneau »
// « S'assurer que… »      → « **Assurez-vous** que… »
// « Ne pas utiliser… »    → « **N'utilisez pas**… »
// Seuls les verbes de la liste ci-dessous sont conjugués : un mot inconnu
// (« atelier », « registre ») n'est jamais touché.
// ============================================================

/** Infinitif → impératif vouvoyé. Les verbes réguliers en -er sont listés à part. */
const IRREGULAR: Record<string, string> = {
  accueillir: 'accueillez', recueillir: 'recueillez',
  agir: 'agissez', réagir: 'réagissez', avertir: 'avertissez', définir: 'définissez',
  établir: 'établissez', rétablir: 'rétablissez', fournir: 'fournissez', remplir: 'remplissez',
  refroidir: 'refroidissez', munir: 'munissez', réunir: 'réunissez', saisir: 'saisissez',
  choisir: 'choisissez', finir: 'finissez',
  offrir: 'offrez', ouvrir: 'ouvrez', couvrir: 'couvrez', parcourir: 'parcourez', courir: 'courez',
  prévenir: 'prévenez', intervenir: 'intervenez', revenir: 'revenez', maintenir: 'maintenez',
  tenir: 'tenez', obtenir: 'obtenez', soutenir: 'soutenez', sentir: 'sentez', servir: 'servez',
  fuir: 'fuyez', sortir: 'sortez', partir: 'partez', retenir: 'retenez',
  attendre: 'attendez', combattre: 'combattez', décrire: 'décrivez', inscrire: 'inscrivez',
  écrire: 'écrivez', descendre: 'descendez', inclure: 'incluez', interdire: 'interdisez',
  interrompre: 'interrompez', joindre: 'joignez', rejoindre: 'rejoignez', mettre: 'mettez',
  remettre: 'remettez', permettre: 'permettez', soumettre: 'soumettez', transmettre: 'transmettez',
  prendre: 'prenez', reprendre: 'reprenez', rendre: 'rendez', reconnaître: 'reconnaissez',
  réduire: 'réduisez', conduire: 'conduisez', restreindre: 'restreignez', éteindre: 'éteignez',
  suivre: 'suivez', poursuivre: 'poursuivez', répondre: 'répondez', faire: 'faites',
  être: 'soyez', dire: 'dites', lire: 'lisez', recevoir: 'recevez', prévoir: 'prévoyez',
  voir: 'voyez', savoir: 'sachez', battre: 'battez',
  suspendre: 'suspendez', contenir: 'contenez', détenir: 'détenez', entretenir: 'entretenez',
  défendre: 'défendez', étendre: 'étendez', tendre: 'tendez', vendre: 'vendez', perdre: 'perdez',
};

/** Verbes réguliers en -er rencontrés dans les procédures (impératif = -ez). */
const REGULAR_ER = `abaisser accompagner accuser accéder actionner activer actualiser adapter administrer
aggraver aider ajuster alerter alimenter allumer amener analyser annoncer appeler appliquer apporter
approcher archiver arrêter assister assurer autoriser aviser balayer barricader bloquer boucher capturer
cesser circuler classer collaborer commencer communiquer compiler compléter composer concentrer confier
confirmer conserver considérer consigner consulter contacter contourner contribuer coopérer coordonner
couper créer demander demeurer desserrer diffuser diriger diviser documenter donner dresser débuter
déclencher délimiter déléguer déplacer déposer désigner détecter déterminer déverrouiller effectuer
employer empêcher encadrer enclencher encourager enfiler entrer envisager envoyer faciliter fermer filmer
forcer former fouiller fumer garder guider gérer identifier inciter indiquer informer inspecter installer
intégrer isoler laisser lancer lever limiter manipuler mener mentionner minimiser montrer nettoyer noter
observer ordonner organiser orienter participer placer porter positionner prioriser privilégier procéder
prolonger proposer protéger provoquer préciser préparer présenter présumer publier pénétrer quitter
rappeler rapporter rassembler rassurer recenser recommander reculer rediriger redoubler redémarrer refuser
remuer reporter repérer respirer rester retirer retourner rincer réaliser réanimer réarmer rédiger
réintégrer réparer répéter réévaluer signaler superviser supprimer surveiller sécuriser tenter
tester toucher traiter travailler utiliser valider veiller ventiler verrouiller vérifier écouter éloigner
évacuer évaluer éviter exposer référer déranger relayer désactiver réactiver ramener renseigner
escorter compter dénombrer aérer débrancher brancher démarrer stationner garer relever`.split(/\s+/).filter(Boolean);

const VERBS = new Map<string, string>([
  ...REGULAR_ER.map((v) => [v, v.replace(/er$/, 'ez')] as [string, string]),
  ...Object.entries(IRREGULAR),
]);

/** Verbes pronominaux : « se diriger » → « dirigez-vous ». */
const conjugate = (infinitive: string): string | undefined => VERBS.get(infinitive.toLocaleLowerCase('fr-CA'));

const capitalize = (value: string) => value.charAt(0).toLocaleUpperCase('fr-CA') + value.slice(1);
const elide = (word: string) => (/^[aeiouhâàéèêîïôûœ]/i.test(word) ? `N'${word}` : `Ne ${word}`);

const WORD = "[A-Za-zÀ-ÿœŒ]+";

/**
 * Convertit l'action de tête d'une étape. Retourne null si l'étape ne
 * commence pas par un verbe connu à l'infinitif.
 */
function convertHead(text: string): { head: string; rest: string } | null {
  let m: RegExpMatchArray | null;
  // Ne pas / Ne jamais / Ne plus / Ne rien + (se|s') verbe
  if ((m = text.match(new RegExp(`^ne\\s+(pas|jamais|plus|rien)\\s+(?:(se|s')\\s*)?(${WORD})\\b(.*)$`, 'iu')))) {
    const verb = conjugate(m[3]);
    if (!verb) return null;
    const head = m[2] ? `Ne vous ${verb} ${m[1].toLowerCase()}` : `${elide(verb)} ${m[1].toLowerCase()}`;
    return { head, rest: m[4] };
  }
  // Ne + verbe (« Ne toucher à rien »)
  if ((m = text.match(new RegExp(`^ne\\s+(${WORD})\\b(.*)$`, 'iu')))) {
    const verb = conjugate(m[1]);
    if (!verb) return null;
    return { head: `${elide(verb)}`, rest: m[2] };
  }
  // se + verbe / s'verbe
  if ((m = text.match(new RegExp(`^(?:se\\s+|s'|s’)(${WORD})\\b(.*)$`, 'iu')))) {
    const verb = conjugate(m[1]);
    if (!verb) return null;
    return { head: `${capitalize(verb)}-vous`, rest: m[2] };
  }
  if ((m = text.match(new RegExp(`^(${WORD})\\b(.*)$`, 'iu')))) {
    const verb = conjugate(m[1]);
    if (!verb) return null;
    return { head: capitalize(verb), rest: m[2] };
  }
  return null;
}


/** « sans s'exposer » → « sans vous exposer » (le sujet est la personne qui lit). */
function reflexiveAfterPreposition(rest: string): string {
  return rest.replace(/\b(sans|pour|afin de|avant de)\s+(?:se\s+|s'|s’)([A-Za-zÀ-ÿœŒ]+)/giu, (all, prep, word) =>
    conjugate(word) ? `${prep} vous ${/^[aeiouhâàéèêîïôûœ]/i.test(word) ? '' : ''}${word}` : all,
  );
}

const GOVERNING = /(?:\b(?:de|d'|d’|à|pour|sans|afin de|avant de|après|pouvoir|devoir|faut)\s*:?\s*(?:(?:se|s'|s’|les|leur|l'|l’|lui|le|la|en|y)\s*)?)$/iu;

/**
 * Un verbe coordonné (« et informer », « — éloigner ») prend la forme du
 * dernier verbe qui le précède : vouvoyé si ce verbe l'est, infinitif s'il
 * dépend d'une préposition (« pour analyser… et identifier »).
 */
function convertCoordinated(rest: string, negative: boolean): string {
  const verbToken = new RegExp(`(${WORD})`, 'gu');
  const coordination = new RegExp(
    `(\\bet|\\bou|\\bpuis|,|;|—)(\\s+)(?:(ne\\s+pas)\\s+)?(?:(se\\s+|s'|s’|les\\s+|leur\\s+|lui\\s+))?(${WORD})\\b`,
    'giu',
  );
  // Le dernier verbe avant `index` est-il un infinitif dépendant d'une préposition ?
  const lastVerbIsGoverned = (text: string, index: number): boolean => {
    let governed = false;
    for (const m of text.slice(0, index).matchAll(verbToken)) {
      const word = m[1];
      const before = text.slice(0, m.index);
      if (/ez$/u.test(word) || /^(faites|dites|soyez|sachez)$/iu.test(word)) governed = false;
      else if (conjugate(word) && word === word.toLocaleLowerCase('fr-CA')) governed = GOVERNING.test(before);
    }
    return governed;
  };
  let output = '';
  let cursor = 0;
  let stillNegative = negative;
  let subjectClause = false;
  let match: RegExpExecArray | null;
  coordination.lastIndex = 0;
  while ((match = coordination.exec(rest))) {
    const [all, sep, space, neg, pronoun, word] = match;
    const index = match.index;
    output += rest.slice(cursor, index);
    const clauseBreak = sep === '—' || sep === ';';
    if (clauseBreak) {
      stillNegative = false;
      // « — forcer les portes … pourrait aggraver » : infinitif sujet, on n'y touche pas.
      const clause = rest.slice(index + sep.length).split(/—|;/)[0];
      subjectClause = /\b(pourrait|pourraient|peut|peuvent|risque|risquent|est|sont|serait)\b/iu.test(clause);
    }
    const verb = conjugate(word);
    const keep =
      subjectClause ||
      !verb ||
      word !== word.toLocaleLowerCase('fr-CA') ||
      (!clauseBreak && lastVerbIsGoverned(output, output.length));
    if (keep) {
      // Ne consomme que le séparateur : « , ou désigner » sera relu à partir de « ou ».
      output += sep;
      cursor = index + sep.length;
      coordination.lastIndex = cursor;
      continue;
    }
    cursor = index + all.length;
    const p = (pronoun || '').trim().toLowerCase();
    const reflexive = p === 'se' || p === "s'" || p === 's’';
    const object = !reflexive && p ? `-${p}` : '';
    if (neg || stillNegative) {
      const core = reflexive ? `ne vous ${verb} pas` : p ? `ne ${p} ${verb} pas` : `${elide(verb).toLowerCase()} pas`;
      output += `${sep}${space}${core}`;
    } else if (reflexive) output += `${sep}${space}${verb}-vous`;
    else output += `${sep}${space}${verb}${object}`;
  }
  output += rest.slice(cursor);
  return reflexiveAfterPreposition(output);
}

/** Possessifs du lecteur (« gardez son sang-froid » → « votre sang-froid ») et phrases ambiguës. */
const POSSESSIVES: [RegExp, string][] = [
  [/\bson (sang-froid|calme|dossard|poste|équipement|matériel|radio|cellulaire|emplacement)\b/giu, 'votre $1'],
  [/\bsa (disponibilité|position|radio|zone|veste)\b/giu, 'votre $1'],
  [/\bses (effets personnels|coordonnées|observations|équipements)\b/giu, 'vos $1'],
];
const AMBIGUOUS_FIXES: [string, string][] = [
  ['sans les verrouiller et rejoindre', 'sans les verrouiller et rejoignez'],
  ['avant de lever les mesures et consigner', 'avant de lever les mesures et consignez'],
];

function fixAfterConversion(rest: string): string {
  let out = rest;
  for (const [pattern, replacement] of POSSESSIVES) out = out.replace(pattern, replacement);
  for (const [from, to] of AMBIGUOUS_FIXES) out = out.split(from).join(to);
  return out;
}

/**
 * Harmonise une étape : verbe vouvoyé à l'impératif, en gras en tête d'une
 * étape principale. Le texte déjà vouvoyé n'est pas modifié (sauf la mise
 * en gras du verbe de tête).
 */
export function harmonizeStepText(text: string, options: { bold?: boolean } = {}): string {
  if (!text) return text;
  const bold = options.bold !== false;
  const leading = text.match(/^\*\*(.+?)\*\*(.*)$/s);
  const plain = leading ? `${leading[1]}${leading[2]}` : text;
  const boldLength = leading ? leading[1].length : 0;

  const converted = convertHead(plain.trimStart());
  if (!converted) {
    // Déjà vouvoyé : mettre le verbe de tête en gras s'il ne l'est pas.
    if (!bold || leading) return text;
    const m = text.match(new RegExp(`^((?:N'|Ne\\s+)?${WORD}ez(?:-vous)?(?:\\s+(?:pas|jamais|plus|rien))?)(\\b.*)$`, 'u'));
    return m ? `**${m[1]}**${m[2]}` : text;
  }
  const rest = fixAfterConversion(convertCoordinated(converted.rest, /^N(e |')/.test(converted.head)));
  if (!bold) return `${converted.head}${rest}`;
  // Le gras d'origine couvrait plus que le verbe (« **Appeler le 9-1-1** ») : on le garde aussi long.
  if (leading && boldLength > 0) {
    const originalBoldTail = leading[1].replace(/^\S+(?:\s+(?:pas|jamais|plus|rien))?/i, '');
    if (originalBoldTail && rest.startsWith(originalBoldTail)) {
      return `**${converted.head}${originalBoldTail}**${rest.slice(originalBoldTail.length)}`;
    }
  }
  return `**${converted.head}**${rest}`;
}

/** Applique le style à une étape et à ses sous-étapes (sous-étapes sans gras ajouté). */
export function harmonizeStep<T extends { textFR?: string; subSteps?: any[] }>(step: T, isSub = false): T {
  if (!step || typeof step.textFR !== 'string') return step;
  const textFR = harmonizeStepText(step.textFR, { bold: !isSub });
  const subSteps = Array.isArray(step.subSteps)
    ? step.subSteps.map((sub) => harmonizeStep(sub, true))
    : step.subSteps;
  return { ...step, textFR, ...(subSteps ? { subSteps } : {}) };
}
