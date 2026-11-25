// ============================================================
// CORO — Consignes données à l'IA pour structurer une procédure
// Le résultat suit le gabarit de la bibliothèque (procedure-template.ts).
// ============================================================

import type { TemplateIssue } from './procedure-template';

export interface PromptRole {
  code: string;
  labelFR: string;
  labelEN: string;
}

const TEMPLATE_EXAMPLE = `{
  "titleFR": "FUITE DE GAZ NATUREL",
  "titleEN": "NATURAL GAS LEAK",
  "objective": "Protéger les occupants et permettre l'intervention du fournisseur de gaz.",
  "color": "#E67E22",
  "crossReferences": ["P004"],
  "importantBoxes": [
    { "type": "IMPORTANT", "text": "N'actionnez aucun interrupteur dans la zone.", "textEN": "Do not operate any switch in the area." }
  ],
  "roleSections": [
    {
      "roleCode": "ROLE-CU",
      "roleLabelFR": "Coordonnateur d'urgence",
      "roleLabelEN": "Emergency Coordinator",
      "steps": [
        { "textFR": "**Vérifiez** l'emplacement de la fuite signalée.", "textEN": "**Verify** the location of the reported leak." },
        {
          "textFR": "**Contactez** le 9-1-1 et fournissez :",
          "textEN": "**Contact** 9-1-1 and provide:",
          "isRed": true,
          "subSteps": [
            { "textFR": "l'adresse complète du bâtiment ;", "textEN": "the complete building address;" },
            { "textFR": "le secteur touché.", "textEN": "the affected sector." }
          ]
        }
      ]
    },
    {
      "roleCode": "TOUS",
      "roleLabelFR": "Personne qui constate l'odeur de gaz",
      "roleLabelEN": "Person who notices the gas smell",
      "steps": [
        { "textFR": "**Quittez** la zone sans actionner d'interrupteur.", "textEN": "**Leave** the area without operating any switch." }
      ]
    }
  ]
}`;

export function buildProcedurePrompt(text: string, roles: PromptRole[]): string {
  const roleList = roles.map((r) => `- ${r.code} = ${r.labelFR} / ${r.labelEN}`).join('\n');
  return `Tu es un expert en rédaction de procédures d'urgence pour des bâtiments du Québec (PMU, PSI).
Structure le texte ci-dessous en UNE procédure au format JSON de CORO.

RÔLES DE L'ORGANIGRAMME DU PROJET (utilise uniquement ces codes) :
${roleList}
- TOUS = une section qui s'adresse à tout le monde ou à une situation (« Personne qui constate l'incident ») ; donne-lui alors un roleLabelFR / roleLabelEN qui décrit cette personne.

RÈGLES DE FOND
1. Ne perds aucune information du texte : chaque consigne, numéro, lieu, délai, seuil et contact doit se retrouver dans une étape, une sous-étape ou un encadré.
2. N'invente rien : pas de consigne, de numéro ni de rôle absents du texte.
3. Range chaque consigne sous le rôle qui l'exécute. Si le texte nomme un rôle qui n'est pas dans la liste, place ses consignes sous le rôle de la liste qui lui correspond le mieux et indique-le dans "unmappedRoles" (nom tel qu'écrit dans le texte).
4. Pas de limite au nombre de rôles ni d'étapes : garde toutes les étapes, dans l'ordre du texte.

RÈGLES DE FORME (identiques à la bibliothèque CORO)
5. Chaque étape commence par un verbe au vouvoiement impératif, en gras : « **Vérifiez** … », « **Assurez-vous** que … », « **N'utilisez pas** … ». Jamais d'infinitif (« Vérifier ») ni de tutoiement.
6. Une énumération devient des "subSteps" (sans gras, terminées par « ; » puis « . » pour la dernière).
7. "isRed": true seulement pour l'appel au 9-1-1 ou une interdiction vitale.
8. Chaque texte a sa traduction anglaise fidèle ("textEN"), au même impératif (« **Verify** … »). Titres en MAJUSCULES.
9. "color" : #C0392B incendie/évacuation, #E67E22 bris/panne/fuite, #8E44AD sécurité/menace/confinement, #2980B9 médical/technique, #27AE60 environnement/météo.
10. "importantBoxes" : au plus 3 encadrés (type IMPORTANT ou NOTE), seulement pour un avertissement du texte.
11. "crossReferences" : codes de procédures CORO mentionnées (ex. P004), sinon [].

EXEMPLE DE FORMAT (le contenu est fictif) :
${TEMPLATE_EXAMPLE}

TEXTE À STRUCTURER :
<<<
${text}
>>>

Réponds UNIQUEMENT avec le JSON (mêmes clés que l'exemple, plus "unmappedRoles": [] ), sans texte avant ni après.`;
}

export function buildCorrectionPrompt(json: unknown, issues: TemplateIssue[], roles: PromptRole[]): string {
  return `Corrige cette procédure JSON pour respecter le gabarit CORO, sans rien retirer ni ajouter au fond.

Points à corriger :
${issues.slice(0, 40).map((i) => `- ${i.where} : ${i.problem}`).join('\n')}

Rappels : chaque étape commence par un verbe au vouvoiement impératif en gras (« **Vérifiez** … ») ; chaque texte a sa traduction anglaise ; codes de rôle permis : ${roles.map((r) => r.code).join(', ')}, TOUS.

Procédure :
${JSON.stringify(json)}

Réponds UNIQUEMENT avec le JSON corrigé, mêmes clés.`;
}

/** Extrait le premier objet JSON d'une réponse (tolère ```json … ```). */
export function parseJsonAnswer(raw: string): any {
  const cleaned = (raw || '').replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Réponse de l’IA illisible');
  return JSON.parse(cleaned.slice(start, end + 1));
}
