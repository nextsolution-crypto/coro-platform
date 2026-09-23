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
