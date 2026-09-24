/**
 * Spatial annotation vocabulary. Coordinates are percentages of the SOURCE picture (0–100), so a marker always lands
 * on the same picture point whatever slice of the picture a frame shows. Nothing here is baked into an image.
 */
export type SpatialKind = 'callout' | 'floor' | 'zone' | 'point';

export type SpatialItem = {
  id: string;
  /** Reference number shown on the media and in the index. */
  n: number;
  kind: SpatialKind;
  /** Word for the kind, written in the index so the kind never depends on shape or colour: "Niveau", "Zone", "Point". */
  kindLabel: string;
  title: string;
  detail?: string;
  /** Anchor (callout / floor / point) or top-left corner (zone), in picture percent. */
  x: number;
  y: number;
  /** Zone size in picture percent. */
  w?: number;
  h?: number;
  /** Direction the connector or tick leaves the anchor. */
  side?: 'left' | 'right' | 'up' | 'down';
  /** Connector length in rem (desktop). */
  lead?: number;
  /** Floor level or zone code shown on the media, e.g. "06", "RDC", "Z1". */
  code?: string;
  /** Short on-media label (callouts and floors). */
  short?: string;
  /** Point marker shape: a ring for a site, a bracket square for a sensitive location. */
  variant?: 'site' | 'sensitive';
  /** Small screens: only items marked "pin" keep a numbered pin on the media; every item stays in the index. */
  mobile?: 'pin' | 'hide';
  /** Desktop density: "ref" keeps only the numbered marker on the media (dense source media); the index carries the rest. */
  density?: 'full' | 'ref';
};

export type SpatialSlice = readonly [start: number, span: number];
export type SpatialTone = 'light' | 'dark';
