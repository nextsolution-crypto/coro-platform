export type HeroAction = { label: string; href: string };

/** Content contract shared by every hero composition. Copy is always supplied by the page (FR / EN). */
export type HeroCopy = {
  /** Technical label — small, precise, spaced. */
  label: string;
  /** One headline sentence per entry; each entry renders on its own line. */
  title: readonly string[];
  body: string;
  primary: HeroAction;
  secondary?: HeroAction;
};

/** A point of interest expressed in image-relative percentages (0–100). */
export type HeroAnnotation = {
  id: string;
  n: number;
  label: string;
  text: string;
  x: number;
  y: number;
  side: 'left' | 'right' | 'up' | 'down';
  /** Leader-line length in rem (desktop). */
  lead?: number;
};

export type HeroHeading = 'h1' | 'h2' | 'h3';
