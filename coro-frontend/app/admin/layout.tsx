'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

const ORGANIZATION_ADMIN_ROUTES = ['/admin/capacity', '/admin/mandates'];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('coro_token') || localStorage.getItem('coro_token');
    const storedUser = sessionStorage.getItem('coro_user') || localStorage.getItem('coro_user');
    const effectiveUser = user || (storedUser ? JSON.parse(storedUser) : null);

    if (!token && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    const organizationAdminRoute = ORGANIZATION_ADMIN_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
    const allowed = organizationAdminRoute
      ? effectiveUser?.role === 'ADMIN' || effectiveUser?.role === 'SUPER_ADMIN'
      : effectiveUser?.role === 'SUPER_ADMIN';

    if (!allowed) {
      router.replace('/dashboard');
      return;
    }
    setChecked(true);
  }, [isAuthenticated, pathname, router, user]);

  if (!checked) {
    return <div className="min-h-screen bg-slate-50" aria-busy="true" />;
  }

  return children;
}
