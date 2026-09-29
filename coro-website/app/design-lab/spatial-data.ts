import type { SpatialItem } from '@/components/spatial/types';
import type { Locale } from '@/lib/site/locale';

/** Committed assets only. The cutaway and entry are photographic (10px); the drawing and the map are technical media. */
export const spatialAsset = {
  cutaway: { src: '/website-v2/architecture/building-cutaway.webp', ratio: 1536 / 1024 },
  plan: { src: '/website-v2/architecture/building-blueprint.webp', ratio: 1536 / 1024 },
  entry: { src: '/website-v2/architecture/building-entry.webp', ratio: 1515 / 1038 },
  map: { src: '/website-v2/population/population-map-base.webp', ratio: 1536 / 1024 },
} as const;

type Item = Omit<SpatialItem, 'id'>;
const list = (prefix: string, items: readonly Item[]): SpatialItem[] => items.map((item) => ({ ...item, id: `${prefix}${item.n}` }));

const fr = {
  zone: { title: 'Bâtiment et superpositions', lead: 'Comment expliquer un bâtiment, un étage, une zone ou un territoire sans cacher l’objet : de vrais médias, des repères en HTML, une liste de lecture équivalente.', rule: 'Plus le média source est dense, plus les superpositions CORO sont rares.', demo: 'Toutes les étiquettes, zones et valeurs sont des données de démonstration. La carte est un média de référence : aucune géographie ni aucun périmètre réel n’est revendiqué.', scaleTitle: 'Concept d’échelle', scale: [['Territoire', 'Carte de référence'], ['Bâtiment', 'Coupe et niveaux'], ['Étage / zone', 'Zones et accès'], ['Plan technique', 'Planche annotée']], studies: 'Étude', open: 'Vue isolée' },
  a: { name: 'A — Coupe de bâtiment', alt: 'Coupe d’un immeuble de bureaux montrant plusieurs niveaux.', index: 'Repères de la coupe', ref: 'FIG. 04.1', cart: ['Coupe A', 'Tour Prémont · démonstration', 'Étiquettes de démonstration'] as const,
    items: [
      { n: 1, kind: 'floor', kindLabel: 'Niveau', title: 'Étage 06 — Bureaux', detail: 'Zone administrative, deux sorties d’étage.', x: 89, y: 24, side: 'right', code: '06', short: 'Bureaux', mobile: 'pin' },
      { n: 2, kind: 'floor', kindLabel: 'Niveau', title: 'Étage 04 — Espaces partagés', detail: 'Point de rassemblement d’étage.', x: 89, y: 46, side: 'right', code: '04', short: 'Partagé' },
      { n: 3, kind: 'floor', kindLabel: 'Niveau', title: 'Rez-de-chaussée — Accueil', detail: 'Accès principal et poste de sécurité.', x: 89, y: 70, side: 'right', code: 'RDC', short: 'Accueil' },
      { n: 4, kind: 'floor', kindLabel: 'Niveau', title: 'Sous-sol 1 — Technique', detail: 'Locaux techniques et stationnement.', x: 89, y: 82, side: 'right', code: 'SS1', short: 'Technique', mobile: 'pin' },
      { n: 5, kind: 'callout', kindLabel: 'Accès', title: 'Accès principal', detail: 'Entrée publique du bâtiment.', x: 46, y: 66, side: 'left', lead: 11, short: 'Accès principal', mobile: 'pin' },
      { n: 6, kind: 'callout', kindLabel: 'Local', title: 'Salle mécanique', detail: 'Local sensible, accès restreint.', x: 65, y: 84, side: 'down', lead: 2.5, short: 'Salle mécanique' },
    ] satisfies Item[] },
  b: { name: 'B — Planche technique', alt: 'Dessin d’architecture d’un bâtiment : élévation, coupe et plans.', index: 'Repères de la planche', ref: 'PLANCHE 04.2', cart: ['Planche 04.2', 'Élévation · coupe · plans', 'Échelle 1:200 · Démo'] as const,
    items: [
      { n: 1, kind: 'callout', kindLabel: 'Vue', title: 'Élévation', detail: 'Façade principale.', x: 28, y: 30, side: 'left', lead: 6, short: 'Élévation', mobile: 'pin' },
      { n: 2, kind: 'callout', kindLabel: 'Vue', title: 'Coupe A-A’', detail: 'Coupe transversale.', x: 78, y: 30, side: 'right', lead: 6, short: 'Coupe A-A’', mobile: 'pin' },
      { n: 3, kind: 'callout', kindLabel: 'Plan', title: 'Plan du rez-de-chaussée', detail: 'Circulations et accès.', x: 17, y: 75, side: 'right', lead: 7, short: 'Plan RDC', density: 'ref' },
      { n: 4, kind: 'callout', kindLabel: 'Plan', title: 'Plan d’étage type', detail: 'Étage courant.', x: 53, y: 68, side: 'right', lead: 7, short: 'Plan d’étage type', density: 'ref' },
    ] satisfies Item[] },
  c: { name: 'C — Zones d’un lieu', alt: 'Entrée d’un immeuble de bureaux avec son parvis.', index: 'Zones et repères du lieu', ref: 'FIG. 04.3', cart: ['Zones', 'Entrée · parvis', 'Zones de démonstration'] as const,
    items: [
      { n: 1, kind: 'zone', kindLabel: 'Zone', title: 'Hall d’entrée', detail: 'Zone contrôlée : accès pointé.', x: 46, y: 40, w: 28, h: 34, code: 'Z1', short: 'Hall', mobile: 'pin' },
      { n: 2, kind: 'zone', kindLabel: 'Zone', title: 'Parvis', detail: 'Zone publique.', x: 24, y: 78, w: 56, h: 18, code: 'Z2', short: 'Parvis', mobile: 'pin' },
      { n: 3, kind: 'callout', kindLabel: 'Repère', title: 'Signalisation d’évacuation', detail: 'Repère au-dessus de la porte.', x: 14, y: 40, side: 'up', lead: 3, short: 'Signalisation' },
    ] satisfies Item[] },
  d: { name: 'D — Territoire', alt: 'Carte de référence d’un secteur urbain et industriel.', index: 'Repères de la carte', ref: 'CARTE DE RÉFÉRENCE', cart: ['Carte 04.4', 'Secteur · démonstration', 'Média de référence'] as const,
    note: 'Carte de référence et de démonstration : les zones, lieux et valeurs affichés ne représentent aucun territoire réel.', legend: 'Légende', legendItems: [['Z1', 'ZPI — zone démo 1'], ['Z2', 'ZPU — zone démo 2'], ['Z3', 'ZIP — zone démo 3']] as const,
    items: [
      { n: 1, kind: 'point', variant: 'site', kindLabel: 'Site', title: 'Site industriel', detail: 'Site de démonstration.', x: 45.3, y: 48.4, short: 'Site', mobile: 'pin', density: 'ref' },
      { n: 2, kind: 'point', variant: 'sensitive', kindLabel: 'Lieu sensible', title: 'Lieu sensible', detail: 'Repère de démonstration.', x: 64.5, y: 18.8, short: 'Lieu sensible', mobile: 'pin' },
      { n: 3, kind: 'zone', kindLabel: 'Zone', title: 'Zone Z1', detail: 'Périmètre de démonstration.', x: 46, y: 64.5, w: 14, h: 12, code: 'Z1', short: 'ZPI' },
    ] satisfies Item[] },
} as const;

const en = {
  zone: { title: 'Building and overlays', lead: 'How to explain a building, a floor, a zone or a territory without hiding the object: real media, HTML references, an equivalent reading list.', rule: 'The denser the source media, the fewer CORO overlays should appear.', demo: 'All labels, zones and values are demonstration data. The map is reference media: no real geography or perimeter is claimed.', scaleTitle: 'Scale concept', scale: [['Territory', 'Reference map'], ['Building', 'Section and levels'], ['Floor / zone', 'Zones and access'], ['Technical plan', 'Annotated sheet']], studies: 'Study', open: 'Isolated view' },
  a: { name: 'A — Building section', alt: 'Cutaway of an office building showing several levels.', index: 'Section references', ref: 'FIG. 04.1', cart: ['Section A', 'Prémont Tower · demonstration', 'Demonstration labels'] as const,
    items: [
      { n: 1, kind: 'floor', kindLabel: 'Level', title: 'Floor 06 — Offices', detail: 'Administrative zone, two floor exits.', x: 89, y: 24, side: 'right', code: '06', short: 'Offices', mobile: 'pin' },
      { n: 2, kind: 'floor', kindLabel: 'Level', title: 'Floor 04 — Shared spaces', detail: 'Floor assembly point.', x: 89, y: 46, side: 'right', code: '04', short: 'Shared' },
      { n: 3, kind: 'floor', kindLabel: 'Level', title: 'Ground floor — Reception', detail: 'Main access and security desk.', x: 89, y: 70, side: 'right', code: 'GF', short: 'Reception' },
      { n: 4, kind: 'floor', kindLabel: 'Level', title: 'Basement 1 — Technical', detail: 'Technical rooms and parking.', x: 89, y: 82, side: 'right', code: 'B1', short: 'Technical', mobile: 'pin' },
      { n: 5, kind: 'callout', kindLabel: 'Access', title: 'Main access', detail: 'Public building entrance.', x: 46, y: 66, side: 'left', lead: 11, short: 'Main access', mobile: 'pin' },
      { n: 6, kind: 'callout', kindLabel: 'Room', title: 'Mechanical room', detail: 'Sensitive room, restricted access.', x: 65, y: 84, side: 'down', lead: 2.5, short: 'Mechanical room' },
    ] satisfies Item[] },
  b: { name: 'B — Technical sheet', alt: 'Architectural drawing of a building: elevation, section and plans.', index: 'Sheet references', ref: 'SHEET 04.2', cart: ['Sheet 04.2', 'Elevation · section · plans', 'Scale 1:200 · Demo'] as const,
    items: [
      { n: 1, kind: 'callout', kindLabel: 'View', title: 'Elevation', detail: 'Main façade.', x: 28, y: 30, side: 'left', lead: 6, short: 'Elevation', mobile: 'pin' },
      { n: 2, kind: 'callout', kindLabel: 'View', title: 'Section A-A’', detail: 'Cross section.', x: 78, y: 30, side: 'right', lead: 6, short: 'Section A-A’', mobile: 'pin' },
      { n: 3, kind: 'callout', kindLabel: 'Plan', title: 'Ground floor plan', detail: 'Circulation and access.', x: 17, y: 75, side: 'right', lead: 7, short: 'GF plan', density: 'ref' },
      { n: 4, kind: 'callout', kindLabel: 'Plan', title: 'Typical floor plan', detail: 'Standard floor.', x: 53, y: 68, side: 'right', lead: 7, short: 'Typical floor plan', density: 'ref' },
    ] satisfies Item[] },
  c: { name: 'C — Zones of a place', alt: 'Entrance of an office building with its forecourt.', index: 'Zones and place references', ref: 'FIG. 04.3', cart: ['Zones', 'Entrance · forecourt', 'Demonstration zones'] as const,
    items: [
      { n: 1, kind: 'zone', kindLabel: 'Zone', title: 'Entrance hall', detail: 'Controlled zone: tracked access.', x: 46, y: 40, w: 28, h: 34, code: 'Z1', short: 'Hall', mobile: 'pin' },
      { n: 2, kind: 'zone', kindLabel: 'Zone', title: 'Forecourt', detail: 'Public zone.', x: 24, y: 78, w: 56, h: 18, code: 'Z2', short: 'Forecourt', mobile: 'pin' },
      { n: 3, kind: 'callout', kindLabel: 'Reference', title: 'Evacuation signage', detail: 'Marker above the door.', x: 14, y: 40, side: 'up', lead: 3, short: 'Signage' },
    ] satisfies Item[] },
  d: { name: 'D — Territory', alt: 'Reference map of an urban and industrial area.', index: 'Map references', ref: 'REFERENCE MAP', cart: ['Map 04.4', 'Sector · demonstration', 'Reference media'] as const,
    note: 'Reference and demonstration map: the zones, places and values shown do not represent any real territory.', legend: 'Legend', legendItems: [['Z1', 'ZPI — demo zone 1'], ['Z2', 'ZPU — demo zone 2'], ['Z3', 'ZIP — demo zone 3']] as const,
    items: [
      { n: 1, kind: 'point', variant: 'site', kindLabel: 'Site', title: 'Industrial site', detail: 'Demonstration site.', x: 45.3, y: 48.4, short: 'Site', mobile: 'pin', density: 'ref' },
      { n: 2, kind: 'point', variant: 'sensitive', kindLabel: 'Sensitive place', title: 'Sensitive place', detail: 'Demonstration marker.', x: 64.5, y: 18.8, short: 'Sensitive place', mobile: 'pin' },
      { n: 3, kind: 'zone', kindLabel: 'Zone', title: 'Zone Z1', detail: 'Demonstration perimeter.', x: 46, y: 64.5, w: 14, h: 12, code: 'Z1', short: 'ZPI' },
    ] satisfies Item[] },
} as const;

export const spatialCopy = { fr, en } as const;
export const spatialItems = (locale: Locale, study: 'a' | 'b' | 'c' | 'd') => list(study, spatialCopy[locale][study].items as readonly Item[]);
