const DEFAULT_PUBLIC_API_ORIGIN = 'https://api.getcoro.io'; const DEFAULT_INTERNAL_API_ORIGIN = 'http://coro_backend:3002';
function withoutTrailingApi(value: string): string { return value.replace(/\/+$/, '').replace(/\/api$/i, ''); }
export function publicApiUrl(path: string): string { const origin = withoutTrailingApi(process.env.NEXT_PUBLIC_API_URL || DEFAULT_PUBLIC_API_ORIGIN); return `${origin}/api/${path.replace(/^\/+/, '')}`; }
export function serverApiUrl(path: string): string { const origin = withoutTrailingApi(process.env.INTERNAL_API_URL || DEFAULT_INTERNAL_API_ORIGIN); return `${origin}/api/${path.replace(/^\/+/, '')}`; }
