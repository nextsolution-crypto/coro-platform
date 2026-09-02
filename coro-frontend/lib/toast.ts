export function toast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('coro:toast', { detail: { message, type } }));
}