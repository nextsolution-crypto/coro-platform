'use client';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

export interface ClientUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT_MANAGER' | 'CLIENT_CORPORATE';
  clientId: string;
  clientName: string;
  organizationId: string;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('coro_client_token');
}

export function getUser(): ClientUser | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedUser =
    localStorage.getItem('coro_client_user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as ClientUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function setAuth(
  token: string,
  user: ClientUser
) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    'coro_client_token',
    token
  );

  localStorage.setItem(
    'coro_client_user',
    JSON.stringify(user)
  );
}

export function clearAuth() {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(
    'coro_client_token'
  );

  localStorage.removeItem(
    'coro_client_user'
  );
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

function handleUnauthorized() {
  clearAuth();

  if (typeof window !== 'undefined') {
    window.location.replace('/login');
  }
}

async function parseResponse(res: Response) {
  const contentType =
    res.headers.get('content-type');

  if (
    contentType?.includes(
      'application/json'
    )
  ) {
    return res.json();
  }

  return res.text();
}

export async function apiGet(
  path: string
) {
  const token = getToken();

  const res = await fetch(
    `${API_URL}${path}`,
    {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':
          'application/json',
      },
    }
  );

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Non autorisé');
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(
      typeof data === 'string'
        ? data
        : data?.message ||
            'Erreur API'
    );
  }

  return data;
}

export async function apiPost(
  path: string,
  body: unknown
) {
  const token = getToken();

  const res = await fetch(
    `${API_URL}${path}`,
    {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type':
          'application/json',
      },

      body: JSON.stringify(body),
    }
  );

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('Non autorisé');
  }

  const data = await parseResponse(res);

  if (!res.ok) {
    throw new Error(
      typeof data === 'string'
        ? data
        : data?.message ||
            'Erreur API'
    );
  }

  return data;
}