'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import OperationalPermissionsPanel from '@/app/clients/[id]/OperationalPermissionsPanel';

interface PlatformClient { id: string; name: string; city?: string; province?: string; isActive: boolean; organization: { id: string; name: string }; _count: { buildings: number; clientUsers: number }; }

export default function PlatformClientPermissionsPage() {
  const { organizationId, clientId } = useParams<{ organizationId: string; clientId: string }>();
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [client, setClient] = useState<PlatformClient | null>(null);

  useEffect(() => { initAuth(); }, [initAuth]);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
    api.get(`/admin/organizations/${organizationId}/clients/${clientId}`).then(({ data }) => setClient(data));
  }, [clientId, isAuthenticated, organizationId, router, user?.role]);

  return <AppLayout>
    {!client ? <p className="py-12 text-center text-sm" style={{ color: '#6C757D' }}>Chargement...</p> : <>
      <div className="mb-7">
        <button type="button" onClick={() => router.push(`/admin/organizations/${organizationId}`)} className="text-sm mb-3" style={{ color: '#C0392B' }}>← {client.organization.name}</button>
        <p className="text-xs font-semibold uppercase" style={{ color: '#6C757D' }}>Organisation cible · {client.organization.name}</p>
        <h1 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>{client.name}</h1>
        <p className="text-sm mt-1" style={{ color: '#6C757D' }}>{client._count.buildings} bâtiment(s) · {client._count.clientUsers} utilisateur(s) client</p>
      </div>
      <OperationalPermissionsPanel clientId={clientId} endpointBase={`/admin/organizations/${organizationId}/clients/${clientId}`} />
    </>}
  </AppLayout>;
}
