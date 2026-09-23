'use client';

import type { TeamCandidate } from './types';
import { groupCandidates, selectLead, toggleSupport, type TeamDraft } from './teamPickerState';
import styles from './planning.module.css';

const labels = { AVAILABLE: 'Disponibles', UNKNOWN: 'À vérifier', BLOCKED: 'Non disponibles' } as const;

export default function TeamPicker({ candidates, team, onChange }: {
  candidates: TeamCandidate[]; team: TeamDraft; onChange: (team: TeamDraft) => void;
}) {
  const groups = groupCandidates(candidates);
  return <section className={styles.teamPicker} aria-labelledby="team-picker-title">
    <div className={styles.sectionHeading}><h3 id="team-picker-title">Équipe</h3><span>Choix par conseiller</span></div>
    <label>LEAD<select value={team.leadId} onChange={event => onChange(selectLead(team, event.target.value, candidates))}>
      <option value="">Choisir un LEAD</option>{candidates.filter(candidate => candidate.availabilityStatus !== 'BLOCKED').map(candidate =>
        <option key={candidate.userId} value={candidate.userId}>{candidate.displayName}{candidate.availabilityStatus === 'UNKNOWN' ? ' · À vérifier' : ''}</option>)}</select></label>
    {(['AVAILABLE', 'UNKNOWN', 'BLOCKED'] as const).map(status => <div key={status} className={styles.candidateGroup}>
      <h4>{labels[status]}</h4>{groups[status].length ? groups[status].map(candidate => <div key={candidate.userId} className={styles.candidateRow}>
        <div><strong>{candidate.displayName}</strong><span>{candidate.genericReason}</span>
          {candidate.capacityCommittedPercent !== null && <small>Charge engagée : {candidate.capacityCommittedPercent} % · 12 sem.</small>}</div>
        <button type="button" disabled={status === 'BLOCKED' || team.leadId === candidate.userId}
          onClick={() => onChange(toggleSupport(team, candidate.userId, candidates))}>
          {team.supportIds.includes(candidate.userId) ? 'Retirer SUPPORT' : '+ Ajouter SUPPORT'}
        </button>
      </div>) : <p>Aucun conseiller.</p>}</div>)}
  </section>;
}
