'use client';

import type { TeamCandidate } from './types';
import type { TeamDraft } from './teamPickerState';
import { formatClock } from './time';
import styles from './planning.module.css';

export default function SchedulingPreview({ complete, loading, candidates, team, timeZone }: {
  complete: boolean; loading: boolean; candidates: TeamCandidate[]; team: TeamDraft; timeZone: string;
}) {
  if (!complete) return <p className={styles.notice}>Définissez un créneau pour vérifier la disponibilité.</p>;
  if (loading) return <p className={styles.notice} role="status">Vérification des disponibilités…</p>;
  const selected = candidates.filter(candidate => candidate.userId === team.leadId || team.supportIds.includes(candidate.userId));
  if (!selected.length) return <p className={styles.notice}>Choisissez un LEAD ou des SUPPORT pour afficher leur prévisualisation.</p>;
  return <section className={styles.schedulingPreview}><h3>Disponibilité de l’équipe</h3>{selected.map(candidate =>
    <div key={candidate.userId} className={styles.previewRow}><strong>{candidate.availabilityStatus === 'AVAILABLE' ? '✓' : candidate.availabilityStatus === 'UNKNOWN' ? '?' : '⚠'} {candidate.displayName}</strong>
      <span>{candidate.genericReason}{candidate.blockedInterval ? ` ${formatClock(candidate.blockedInterval.startUtc, timeZone)}–${formatClock(candidate.blockedInterval.endUtc, timeZone)}` : ''}</span></div>)}</section>;
}
