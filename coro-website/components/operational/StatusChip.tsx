import { stateGlyph, type OpsState, type OpsTone } from './types';
import styles from './operational.module.css';

/**
 * Compact semantic state: glyph + written label. The pill is allowed here because status is its proper use; it stays
 * outlined and small (no filled colour blocks). "Live" / "active" is NOT a separate indicator: it is a static
 * state with a label, e.g. the critical or information state labelled "Actif" (no pulse, no glow, no loop).
 */
export function StatusChip({ state, label, srPrefix, tone }: { state: OpsState; label: string; srPrefix?: string; tone?: OpsTone }) {
  return (
    <span className={`${styles.ops} ${styles.chip}`} data-state={state} data-ops-tone={tone}>
      <span className={styles.glyph} aria-hidden="true">{stateGlyph[state]}</span>
      {srPrefix && <span className={styles.sr}>{srPrefix} </span>}
      {label}
    </span>
  );
}
