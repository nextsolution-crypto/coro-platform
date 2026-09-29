import { stateGlyph, type OpsState, type OpsTone } from './types';
import styles from './operational.module.css';

export type PeopleGroup = { key: string; label: string; value: number; state: Extract<OpsState, 'complete' | 'attention' | 'info'> };

/**
 * Accountability state without profile photos or directory chrome: a proportional rule (solid = accounted for,
 * hatched = to verify) and a plain list of counts with glyph and label. The rule is decoration; the list is the content.
 */
export function PeopleStatus({ label, groups, tone }: { label: string; groups: readonly PeopleGroup[]; tone?: OpsTone }) {
  const total = groups.reduce((sum, group) => sum + group.value, 0);
  return (
    <div className={`${styles.ops} ${styles.people}`} data-ops-tone={tone}>
      <div className={styles.peopleBar} aria-hidden="true">
        {groups.filter((g) => g.state !== 'info').map((g) => <span key={g.key} data-state={g.state} style={{ flexGrow: (g.value / Math.max(total, 1)) * 100 }} />)}
      </div>
      <dl className={styles.peopleList} aria-label={label}>
        {groups.map((g) => (
          <div key={g.key} data-state={g.state}>
            <dt>{g.label}</dt>
            <dd><span className={styles.glyph} aria-hidden="true">{stateGlyph[g.state]}</span>{String(g.value).padStart(2, '0')}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
