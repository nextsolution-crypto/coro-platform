export type PreviewCycle = {
  signal: AbortSignal;
  isCurrent: () => boolean;
  cancel: () => void;
};

export function createPreviewCycleGuard() {
  let latest = 0;

  return {
    begin(): PreviewCycle {
      const id = ++latest;
      const controller = new AbortController();
      return {
        signal: controller.signal,
        isCurrent: () => id === latest && !controller.signal.aborted,
        cancel: () => {
          if (id === latest) latest += 1;
          controller.abort();
        },
      };
    },
    invalidate() {
      latest += 1;
    },
  };
}

export function isPreviewCancellation(cause: unknown) {
  if (!cause || typeof cause !== 'object') return false;
  const value = cause as { name?: string; code?: string };
  return value.name === 'AbortError' || value.name === 'CanceledError' || value.code === 'ERR_CANCELED';
}

export function buildTeamPreviewRequest(input: {
  buildingId: string;
  timeZone: string;
  date: string;
  time: string;
  durationMinutes: number;
}, boundary: (date: string, minute: number, timeZone: string) => Date) {
  if (!input.buildingId || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time) ||
    !Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) return null;
  const minute = Number(input.time.slice(0, 2)) * 60 + Number(input.time.slice(3));
  const instant = boundary(input.date, minute, input.timeZone);
  if (!Number.isFinite(instant.getTime())) return null;
  return { buildingId: input.buildingId, startUtc: instant.toISOString(), durationMinutes: input.durationMinutes };
}
