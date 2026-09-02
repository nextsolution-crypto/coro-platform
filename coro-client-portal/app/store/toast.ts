export function toast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('portal:toast', { detail: { message, type } }));
}