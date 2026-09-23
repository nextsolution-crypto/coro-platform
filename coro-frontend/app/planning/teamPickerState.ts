import type { TeamCandidate } from './types';

export type TeamDraft = { leadId: string; supportIds: string[] };

export function completeSlot(date: string, time: string, durationMinutes: number | null) {
  return Boolean(/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(time) && durationMinutes && durationMinutes >= 15);
}

export function groupCandidates(candidates: TeamCandidate[]) {
  return {
    AVAILABLE: candidates.filter(candidate => candidate.availabilityStatus === 'AVAILABLE'),
    UNKNOWN: candidates.filter(candidate => candidate.availabilityStatus === 'UNKNOWN'),
    BLOCKED: candidates.filter(candidate => candidate.availabilityStatus === 'BLOCKED'),
  };
}

export function selectLead(team: TeamDraft, userId: string, candidates: TeamCandidate[]): TeamDraft {
  const candidate = candidates.find(item => item.userId === userId);
  if (!candidate || candidate.availabilityStatus === 'BLOCKED') return team;
  return { leadId: userId, supportIds: team.supportIds.filter(id => id !== userId) };
}

export function toggleSupport(team: TeamDraft, userId: string, candidates: TeamCandidate[]): TeamDraft {
  const candidate = candidates.find(item => item.userId === userId);
  if (!candidate || candidate.availabilityStatus === 'BLOCKED' || team.leadId === userId) return team;
  return team.supportIds.includes(userId)
    ? { ...team, supportIds: team.supportIds.filter(id => id !== userId) }
    : { ...team, supportIds: [...team.supportIds, userId] };
}

export function teamDirty(team: TeamDraft, date: string, time: string, durationMinutes: number | null) {
  return Boolean(team.leadId || team.supportIds.length || date || time || durationMinutes);
}
