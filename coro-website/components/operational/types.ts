/**
 * Operational state vocabulary. A state is ALWAYS carried by a glyph (shape) plus a written label; colour only reinforces it.
 * normal ● · information i · attention △ · critical ! · complete ✓
 */
export type OpsState = 'normal' | 'info' | 'attention' | 'critical' | 'complete';
export type OpsTone = 'light' | 'dark';

export const stateGlyph: Record<OpsState, string> = { normal: '●', info: 'i', attention: '△', critical: '!', complete: '✓' };
