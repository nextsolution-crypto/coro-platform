import type { HeroAnnotation, HeroCopy } from '@/components/hero/types';
import type { OperationalStatus } from '@/components/hero/HeroOperational';
import type { TechnicalReference } from '@/components/hero/HeroTechnical';
import type { Locale } from '@/lib/site/locale';

/**
 * Design Lab demonstration copy for the three LAB-02 hero studies.
 * All copy is DEMO material, not final page copy. All operational values are sample data.
 */
type Notes = { family: string; principle: string; mobile: string };

export type HeroStudies = {
  zone: { title: string; lead: string; noteLabels: { family: string; principle: string; mobile: string }; stress: string; headerModes: { separate: string; integrated: string } };
  a2: { name: string; copy: HeroCopy; mediaAlt: string; caption: string; datum: string; annotationsLabel: string; annotations: readonly HeroAnnotation[]; notes: Notes };
  a: { name: string; copy: HeroCopy; mediaAlt: string; caption: string; annotationsLabel: string; annotations: readonly HeroAnnotation[]; notes: Notes };
  b: { name: string; copy: HeroCopy; mediaAlt: string; panel: { title: string; demo: string; note: string; label: string; items: readonly OperationalStatus[] }; notes: Notes };
  c: { name: string; copy: HeroCopy; mediaAlt: string; referencesLabel: string; references: readonly TechnicalReference[]; titleBlock: readonly [string, string, string]; inset: { alt: string; caption: string }; notes: Notes };
};

export const heroStudies: Record<Locale, HeroStudies> = {
  fr: {
    zone: {
      title: 'Système de héros',
      lead: 'Trois compositions d’une même famille : même ADN (marine, filets, étiquettes techniques, rouge d’action), trois personnalités. Aucune n’est un gabarit avec une autre image.',
      noteLabels: { family: 'Famille prévue', principle: 'Principe de composition', mobile: 'Comportement mobile' },
      stress: 'Copie de démonstration — non finale.',
      headerModes: { separate: 'en-tête blanc séparé', integrated: 'en-tête intégré (étude Lab)' },
    },
    a: {
      name: 'A1 — Architectural jour (actuel)',
      copy: {
        label: 'CORO · Résilience opérationnelle',
        title: ['Des bâtiments plus sûrs.', 'Des décisions plus éclairées.'],
        body: 'Relier les plans, les personnes et les données pour transformer la préparation en capacité réelle d’action.',
        primary: { label: 'Demander une démonstration', href: '#heroes' },
        secondary: { label: 'Découvrir l’écosystème', href: '#heroes' },
      },
      mediaAlt: 'Tour de bureaux vitrée au coucher du soleil, hall d’entrée éclairé et parvis piéton.',
      caption: 'Tour Prémont · Bâtiment de démonstration',
      annotationsLabel: 'Points d’intérêt du bâtiment de démonstration',
      annotations: [
        { id: 'plans', n: 1, label: 'Plans', text: 'Niveaux 1 à 10', x: 62, y: 22, side: 'left', lead: 9 },
        { id: 'occupation', n: 2, label: 'Occupation', text: 'Vue par étage', x: 38, y: 66, side: 'left', lead: 5 },
        { id: 'intervention', n: 3, label: 'Intervention', text: 'Point de rassemblement', x: 56, y: 86, side: 'left', lead: 4 },
      ],
      notes: {
        family: 'Accueil · Plateforme · Client (architectural clair).',
        principle: 'Le bâtiment est le sujet : plaque à ratio verrouillé, collée au bord de l’écran, texte sur blanc. Profondeur par le média et le contraste de surface, sans ombre.',
        mobile: 'Le bâtiment reste plein cadre (recadré, non réduit). Les annotations deviennent des repères numérotés sur l’image et une courte liste dessous.',
      },
    },
    a2: {
      name: 'A2 — ARCHITECTURAL SIGNATURE — REVIEW',
      copy: {
        label: 'CORO · Résilience opérationnelle',
        title: ['Des bâtiments plus sûrs.', 'Des décisions plus éclairées.'],
        body: 'Relier les plans, les personnes et les données pour transformer la préparation en capacité réelle d’action.',
        primary: { label: 'Demander une démonstration', href: '#heroes' },
        secondary: { label: 'Découvrir l’écosystème', href: '#heroes' },
      },
      mediaAlt: 'Tour de bureaux vitrée au coucher du soleil, hall d’entrée éclairé et parvis piéton.',
      caption: 'Tour Prémont · Bâtiment de démonstration',
      datum: 'N.00 · Niveau du sol',
      annotationsLabel: 'Points d’intérêt du bâtiment de démonstration',
      annotations: [
        { id: 'plans', n: 1, label: 'Plans', text: 'Niveaux 1 à 10', x: 54, y: 22, side: 'left', lead: 9 },
        { id: 'occupation', n: 2, label: 'Occupation', text: 'Vue par étage', x: 72, y: 42, side: 'right', lead: 9 },
        { id: 'intervention', n: 3, label: 'Intervention', text: 'Point de rassemblement', x: 52, y: 88, side: 'left', lead: 10 },
      ],
      notes: {
        family: 'Accueil · Plateforme · Client (signature architecturale).',
        principle: 'Le bâtiment est monumental et contenu (10 px sur les coins visibles). Le titre déborde sur le ciel de l’image ; les annotations parlent le langage technique CORO : index, filet, repère. Sans carte ni ombre.',
        mobile: 'Recadrage carré centré sur la tour, titre et actions d’abord ; les annotations deviennent un index numéroté sous l’image.',
      },
    },
    b: {
      name: 'B — Opérationnel sombre',
      copy: {
        label: 'CORO · Sentinelle · Incident',
        title: ['Savoir qui est là.', 'Agir avec précision.'],
        body: 'Occupation, équipes d’urgence et état du bâtiment réunis dans une même vue opérationnelle.',
        primary: { label: 'Demander une démonstration', href: '#heroes' },
        secondary: { label: 'Voir Sentinelle', href: '#heroes' },
      },
      mediaAlt: 'La même tour de bureaux vitrée à la tombée de la nuit, étages éclairés et rue mouillée.',
      panel: {
        label: 'Exemple d’état opérationnel (données de démonstration)',
        title: 'Tour Prémont',
        demo: 'Démo',
        note: 'Données de démonstration, non réelles',
        items: [
          { id: 'building', label: 'Bâtiment', value: 'Normal', kind: 'ok' },
          { id: 'occupation', label: 'Occupation', value: '128', kind: 'number' },
          { id: 'team', label: 'Équipe d’urgence', value: 'Prête', kind: 'ok' },
        ],
      },
      notes: {
        family: 'Sentinelle · Incident · contextes opérationnels.',
        principle: 'Immersion : la photo est fondue dans le marine profond, un seul panneau d’état à filets fins. Le rouge signale l’action, jamais un remplissage.',
        mobile: 'Photo en tête, fondue dans le fond marine ; le panneau devient une liste pleine largeur sous les actions.',
      },
    },
    c: {
      name: 'C — Technique / plan',
      copy: {
        label: 'CORO · Documents',
        title: ['Des plans lisibles.', 'Une conformité maîtrisée.'],
        body: 'Générer, valider et maintenir PMU, PSI et PCA à partir des données du bâtiment.',
        primary: { label: 'Demander une démonstration', href: '#heroes' },
        secondary: { label: 'Voir le processus', href: '#heroes' },
      },
      mediaAlt: 'Planche de dessin bleue d’un bâtiment de démonstration : élévation, coupe transversale, plans de rez-de-chaussée et d’étage, axonométrie.',
      referencesLabel: 'Documents liés à la planche (exemple)',
      references: [
        { id: 'pmu', n: 1, code: 'PMU', label: 'Plan de mesures d’urgence', text: 'Coupe transversale A-A’', x: 74, y: 30, side: 'left' },
        { id: 'psi', n: 2, code: 'PSI', label: 'Plan de sécurité incendie', text: 'Plan d’étage type', x: 52, y: 68, side: 'left' },
        { id: 'pca', n: 3, code: 'PCA', label: 'Plan de continuité', text: 'Services techniques', x: 77, y: 49, side: 'left' },
      ],
      titleBlock: ['Planche 01', 'Élévation · coupe · plans', 'Échelle 1:200 · Démo'],
      inset: { alt: 'Coupe illustrée du bâtiment de démonstration : étages de bureaux, stationnement et locaux techniques.', caption: 'Coupe · niveaux et services' },
      notes: {
        family: 'Documents · Planification · contextes techniques.',
        principle: 'Une planche de dessin, pas une image : surface architecturale, cadre à filets, cartouche, repères numérotés. Le bleu structure ; le rouge reste l’action.',
        mobile: 'La planche passe pleine largeur, les repères restent, l’index documentaire devient la lecture principale. La coupe illustrée (décorative) disparaît.',
      },
    },
  },
  en: {
    zone: {
      title: 'Hero system',
      lead: 'Three compositions from one family: the same DNA (navy, hairlines, technical labels, action red), three personalities. None is a template with a different image.',
      noteLabels: { family: 'Intended family', principle: 'Composition principle', mobile: 'Mobile behavior' },
      stress: 'Demonstration copy — not final.',
      headerModes: { separate: 'separate white header', integrated: 'integrated header (Lab study)' },
    },
    a: {
      name: 'A1 — Architectural day (current)',
      copy: {
        label: 'CORO · Operational resilience',
        title: ['Safer buildings.', 'Better-informed decisions.'],
        body: 'Connect plans, people and data to turn preparedness into real capacity to act.',
        primary: { label: 'Request a demo', href: '#heroes' },
        secondary: { label: 'Explore the ecosystem', href: '#heroes' },
      },
      mediaAlt: 'Glass office tower at sunset, lit lobby and pedestrian plaza.',
      caption: 'Prémont Tower · Demonstration building',
      annotationsLabel: 'Points of interest on the demonstration building',
      annotations: [
        { id: 'plans', n: 1, label: 'Plans', text: 'Levels 1 to 10', x: 62, y: 22, side: 'left', lead: 9 },
        { id: 'occupation', n: 2, label: 'Occupancy', text: 'View by floor', x: 38, y: 66, side: 'left', lead: 5 },
        { id: 'intervention', n: 3, label: 'Response', text: 'Assembly point', x: 56, y: 86, side: 'left', lead: 4 },
      ],
      notes: {
        family: 'Homepage · Platform · Client (light architectural).',
        principle: 'The building is the subject: a ratio-locked plate flush to the screen edge, text on white. Depth from media and surface contrast, no shadow.',
        mobile: 'The building stays full frame (cropped, not shrunk). Annotations become numbered markers on the image and a short list below.',
      },
    },
    a2: {
      name: 'A2 — ARCHITECTURAL SIGNATURE — REVIEW',
      copy: {
        label: 'CORO · Operational resilience',
        title: ['Safer buildings.', 'Better-informed decisions.'],
        body: 'Connect plans, people and data to turn preparedness into real capacity to act.',
        primary: { label: 'Request a demo', href: '#heroes' },
        secondary: { label: 'Explore the ecosystem', href: '#heroes' },
      },
      mediaAlt: 'Glass office tower at sunset, lit lobby and pedestrian plaza.',
      caption: 'Prémont Tower · Demonstration building',
      datum: 'L.00 · Ground level',
      annotationsLabel: 'Points of interest on the demonstration building',
      annotations: [
        { id: 'plans', n: 1, label: 'Plans', text: 'Levels 1 to 10', x: 54, y: 22, side: 'left', lead: 9 },
        { id: 'occupation', n: 2, label: 'Occupancy', text: 'View by floor', x: 72, y: 42, side: 'right', lead: 9 },
        { id: 'intervention', n: 3, label: 'Response', text: 'Assembly point', x: 52, y: 88, side: 'left', lead: 10 },
      ],
      notes: {
        family: 'Homepage · Platform · Client (architectural signature).',
        principle: 'The building is monumental and contained (10px on visible corners). The headline spills onto the sky of the picture; annotations speak the CORO technical language: index, connector, end mark. No cards, no shadows.',
        mobile: 'Square crop centred on the tower, headline and actions first; annotations become a numbered index under the image.',
      },
    },
    b: {
      name: 'B — Operational dark',
      copy: {
        label: 'CORO · Sentinelle · Incident',
        title: ['Know who is there.', 'Act with precision.'],
        body: 'Occupancy, emergency teams and building status brought together in one operational view.',
        primary: { label: 'Request a demo', href: '#heroes' },
        secondary: { label: 'See Sentinelle', href: '#heroes' },
      },
      mediaAlt: 'The same glass office tower at nightfall, lit floors and wet street.',
      panel: {
        label: 'Operational status example (demonstration data)',
        title: 'Prémont Tower',
        demo: 'Demo',
        note: 'Demonstration data, not real',
        items: [
          { id: 'building', label: 'Building', value: 'Normal', kind: 'ok' },
          { id: 'occupation', label: 'Occupancy', value: '128', kind: 'number' },
          { id: 'team', label: 'Emergency team', value: 'Ready', kind: 'ok' },
        ],
      },
      notes: {
        family: 'Sentinelle · Incident · operational contexts.',
        principle: 'Immersion: the photograph melts into deep navy, one hairline status panel. Red signals action, never a fill.',
        mobile: 'Photograph first, melting into the navy ground; the panel becomes a full-width list under the actions.',
      },
    },
    c: {
      name: 'C — Technical / blueprint',
      copy: {
        label: 'CORO · Documents',
        title: ['Clear plans.', 'Compliance under control.'],
        body: 'Generate, validate and maintain PMU, PSI and PCA documents from building data.',
        primary: { label: 'Request a demo', href: '#heroes' },
        secondary: { label: 'See the process', href: '#heroes' },
      },
      mediaAlt: 'Blue drawing sheet of a demonstration building: elevation, cross-section, ground and typical floor plans, axonometric view.',
      referencesLabel: 'Documents linked to the sheet (example)',
      references: [
        { id: 'pmu', n: 1, code: 'PMU', label: 'Emergency measures plan', text: 'Cross-section A-A’', x: 74, y: 30, side: 'left' },
        { id: 'psi', n: 2, code: 'PSI', label: 'Fire safety plan', text: 'Typical floor plan', x: 52, y: 68, side: 'left' },
        { id: 'pca', n: 3, code: 'PCA', label: 'Business continuity plan', text: 'Technical services', x: 77, y: 49, side: 'left' },
      ],
      titleBlock: ['Sheet 01', 'Elevation · section · plans', 'Scale 1:200 · Demo'],
      inset: { alt: 'Illustrated cutaway of the demonstration building: office floors, parking and technical rooms.', caption: 'Section · levels and services' },
      notes: {
        family: 'Documents · Planning · technical contexts.',
        principle: 'A drawing sheet, not a picture: architectural surface, hairline frame, title block, numbered balloons. Blue structures; red stays the action.',
        mobile: 'The sheet goes full width, balloons stay, the document index becomes the primary read. The decorative cutaway is dropped.',
      },
    },
  },
};
