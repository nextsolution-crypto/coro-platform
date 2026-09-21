'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface Organization { id: string; name: string; isActive: boolean; licenseType: string; _count: { clients: number; buildings: number; projects: number }; users: Array<{ id: string; firstName: string; lastName: string; email: string; role: string }>; }
interface ClientSummary { id: string; name: string; city?: string; province?: string; isActive: boolean; _count: { buildings: number; clientUsers: number }; }

export default function PlatformOrganizationPage() {
  const { organizationId } = useParams<{ organizationId: string }>();
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { initAuth(); }, [initAuth]);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (user?.role !== 'SUPER_ADMIN') { router.replace('/dashboard'); return; }
    Promise.all([api.get(`/organizations/${organizationId}`), api.get(`/admin/organizations/${organizationId}/clients`)])
      .then(([organizationResponse, clientsResponse]) => { setOrganization(organizationResponse.data); setClients(clientsResponse.data); })
      .finally(() => setLoading(false));
  }, [isAuthenticated, organizationId, router, user?.role]);

  if (loading || !organization) return <AppLayout><p className="py-12 text-center text-sm" style={{ color: '#6C757D' }}>Chargement...</p></AppLayout>;
  return <AppLayout>
    <div className="mb-7">
      <button type="button" onClick={() => router.push('/admin/organizations')} className="text-sm mb-3" style={{ color: '#C0392B' }}>← Organisations</button>
      <p className="text-xs font-semibold uppercase" style={{ color: '#6C757D' }}>Contexte plateforme</p>
      <h1 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>{organization.name}</h1>
      <p className="text-sm mt-1" style={{ color: '#6C757D' }}>{organization.isActive ? 'Organisation active' : 'Organisation suspendue'} · {organization.licenseType}</p>
    </div>
    <div className="grid sm:grid-cols-3 gap-3 mb-7">
      <Summary label="Clients" value={organization._count.clients} />
      <Summary label="Bâtiments" value={organization._count.buildings} />
      <Summary label="Équipe CORO" value={organization.users.length} />
    </div>
    <section>
      <h2 className="font-semibold mb-3" style={{ color: '#2C3E50' }}>Clients</h2>
      <div className="grid gap-3">
        {clients.map((client) => <button key={client.id} type="button" onClick={() => router.push(`/admin/organizations/${organizationId}/clients/${client.id}`)} className="w-full rounded-md p-4 text-left flex items-center justify-between gap-4" style={{ background: '#FFFFFF', border: '1px solid #E9ECEF' }}>
          <span><strong className="block" style={{ color: '#2C3E50' }}>{client.name}</strong><small style={{ color: '#6C757D' }}>{[client.city, client.province].filter(Boolean).join(', ') || 'Localisation non renseignée'} · {client._count.buildings} bâtiment(s) · {client._count.clientUsers} utilisateur(s) client</small></span>
          <span aria-hidden style={{ color: '#C0392B' }}>→</span>
        </button>)}
        {clients.length === 0 && <p className="text-sm" style={{ color: '#6C757D' }}>Aucun client dans cette organisation.</p>}
      </div>
    </section>
  </AppLayout>;
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-md p-4" style={{ background: '#FFFFFF', border: '1px solid #E9ECEF' }}><strong className="text-xl" style={{ color: '#2C3E50' }}>{value}</strong><span className="block text-xs mt-1" style={{ color: '#6C757D' }}>{label}</span></div>; }
