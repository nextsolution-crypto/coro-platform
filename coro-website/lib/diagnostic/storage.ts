import { DIAGNOSTIC_QUESTION_COUNT } from './config.ts';
import { diagnosticAnswerIds, type DiagnosticStoredState } from './types.ts';

export function parseDiagnosticState(value: string | null): DiagnosticStoredState | null {
  if (!value) return null;
  try {
    const candidate = JSON.parse(value) as Partial<DiagnosticStoredState>;
    if (candidate.version !== 1 || !Number.isInteger(candidate.step) || candidate.step! < 0 || candidate.step! >= DIAGNOSTIC_QUESTION_COUNT || !candidate.responses || typeof candidate.responses !== 'object') return null;
    const responses = Object.fromEntries(Object.entries(candidate.responses).filter(([key, answer]) => /^D[1-8]$/.test(key) && diagnosticAnswerIds.includes(answer as never)));
    return { version: 1, step: candidate.step!, responses };
  } catch { return null; }
}
