import type { CSSProperties } from 'react';
import type { SpatialItem } from './types';
import styles from './spatial.module.css';

/** All marks are decoration for sighted users: the same information is a real ordered list under the frame. */
const anchor = (item: SpatialItem, delay: number) => ({ '--x': item.x, '--y': item.y, '--w': item.w ?? 0, '--h': item.h ?? 0, '--lead': item.lead ?? 4, '--d': `${delay}ms` }) as CSSProperties;

/** Connector line: a horizontal or vertical segment, an end mark at the anchor, an index and a label. */
export function CalloutLine({ item, delay }: { item: SpatialItem; delay: number }) {
  return (
    <span className={styles.mk} data-kind="callout" data-side={item.side ?? 'left'} data-mobile={item.mobile ?? 'hide'} data-density={item.density ?? 'full'} style={anchor(item, delay)} aria-hidden="true">
      <span className={styles.end} />
      <span className={styles.head}><span className={styles.idx}>{String(item.n).padStart(2, '0')}</span><b>{item.short ?? item.title}</b></span>
      {item.detail && <span className={styles.sub}>{item.detail}</span>}
      <span className={styles.pin}>{item.n}</span>
    </span>
  );
}

/** Floor marker: architectural level notation (a tick to the building edge and a compact tag), not a map pin. */
export function FloorMarker({ item, delay }: { item: SpatialItem; delay: number }) {
  return (
    <span className={styles.mk} data-kind="floor" data-side={item.side ?? 'right'} data-mobile={item.mobile ?? 'hide'} data-density={item.density ?? 'full'} style={anchor(item, delay)} aria-hidden="true">
      <span className={styles.end} />
      <span className={styles.tag}><b>{item.code}</b>{item.short && <i>{item.short}</i>}</span>
      <span className={styles.pin}>{item.n}</span>
    </span>
  );
}

/** Zone marker: a hatched, dashed boundary with a corner tag. Hatching and the code identify it; colour does not. */
export function ZoneMarker({ item, delay }: { item: SpatialItem; delay: number }) {
  return (
    <span className={styles.mk} data-kind="zone" data-mobile={item.mobile ?? 'hide'} data-density={item.density ?? 'full'} style={anchor(item, delay)} aria-hidden="true">
      <span className={styles.zonebox} />
      <span className={styles.ztag}><b>{item.code}</b>{item.short && <i>{item.short}</i>}</span>
      <span className={styles.pin}>{item.n}</span>
    </span>
  );
}

/** Point marker: a ring for a site, a bracket square for a sensitive location, with an index tag. */
export function PointMarker({ item, delay }: { item: SpatialItem; delay: number }) {
  return (
    <span className={styles.mk} data-kind="point" data-variant={item.variant ?? 'site'} data-mobile={item.mobile ?? 'hide'} data-density={item.density ?? 'full'} style={anchor(item, delay)} aria-hidden="true">
      <span className={styles.shape} />
      <span className={styles.ptag}><span className={styles.idx}>{String(item.n).padStart(2, '0')}</span>{item.short ?? item.title}</span>
      <span className={styles.pin}>{item.n}</span>
    </span>
  );
}

export function SpatialMark({ item, delay }: { item: SpatialItem; delay: number }) {
  if (item.kind === 'floor') return <FloorMarker item={item} delay={delay} />;
  if (item.kind === 'zone') return <ZoneMarker item={item} delay={delay} />;
  if (item.kind === 'point') return <PointMarker item={item} delay={delay} />;
  return <CalloutLine item={item} delay={delay} />;
}
