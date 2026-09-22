export const REVIEW_PERMISSIONS = ['REX_CREATE', 'REX_EDIT', 'REX_REVIEW', 'REX_FINALIZE'] as const;
export const CORRECTIVE_ACTION_PERMISSIONS = ['CORRECTIVE_ACTION_CREATE', 'CORRECTIVE_ACTION_EDIT', 'CORRECTIVE_ACTION_COMPLETE', 'CORRECTIVE_ACTION_VERIFY', 'CORRECTIVE_ACTION_CLOSE', 'CORRECTIVE_ACTION_REPORT_GENERATE'] as const;
export type ReviewPermission = (typeof REVIEW_PERMISSIONS)[number];
export type CorrectiveActionPermission = (typeof CORRECTIVE_ACTION_PERMISSIONS)[number];

export const OPERATIONAL_PERMISSION_PRESETS = {
  READ_ONLY: { review: [], corrective: [] },
  REX: { review: [...REVIEW_PERMISSIONS], corrective: [] },
  CORRECTIVE_ACTIONS: { review: [], corrective: ['CORRECTIVE_ACTION_CREATE', 'CORRECTIVE_ACTION_EDIT', 'CORRECTIVE_ACTION_COMPLETE'] },
  VERIFICATION: { review: [], corrective: ['CORRECTIVE_ACTION_VERIFY', 'CORRECTIVE_ACTION_CLOSE'] },
  RESILIENCE_MANAGER: { review: [...REVIEW_PERMISSIONS], corrective: [...CORRECTIVE_ACTION_PERMISSIONS] },
} satisfies Record<string, { review: ReviewPermission[]; corrective: CorrectiveActionPermission[] }>;

export type OperationalPermissionPreset = keyof typeof OPERATIONAL_PERMISSION_PRESETS;

export function applyOperationalPermissionPreset(preset: OperationalPermissionPreset) {
  const value = OPERATIONAL_PERMISSION_PRESETS[preset];
  return { review: [...value.review], corrective: [...value.corrective] };
}
