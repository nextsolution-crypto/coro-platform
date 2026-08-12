'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

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
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('coro_client_token');
}

export function getUser(): ClientUser | null {
  if (typeof window === 'undefined') return null;
  const str = localStorage.getItem('coro_client_user');
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export function setAuth(token: string, user: ClientUser) {
  localStorage.setItem('coro_client_token', token);
  localStorage.setItem('coro_client_user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('coro_client_token');
  localStorage.removeItem('coro_client_user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function apiGet(path: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Non autorisé');
  }
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}