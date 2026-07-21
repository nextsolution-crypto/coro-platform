'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { Search, ChevronRight } from 'lucide-react';

interface ProcedureDefault {
  id: string;
  code: string;
  isActive: boolean;
  updatedAt: string;
  content: {
    titleFR: string;
    titleEN: string;
    headerColor: string;
    documentTypes: string[];
  };
}

export default function ProceduresAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [procedures, setProcedures] = useState<ProcedureDefault[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { initAuth(); }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return; }
      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/procedures');
      setProcedures(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = procedures.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.titleFR?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
            Bibliothèque de procédures
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
            {procedures.length} procédures par défaut — modifications appliquées à toutes les organisations
          </p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative mb-6">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#ADB5BD' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par code ou titre..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded focus:outline-none"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}
        />
      </div>

      {/* Liste */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
        {filtered.map((proc, idx) => (
          <div
            key={proc.id}
            onClick={() => router.push(`/admin/procedures/${proc.id}`)}
            className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors"
            style={{
              backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
              borderBottom: '1px solid #E9ECEF',
              borderLeft: `3px solid ${proc.content?.headerColor || '#DEE2E6'}`,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EBF5FB')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA')}
          >
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold font-mono w-12" style={{ color: '#6C757D' }}>
                {proc.code}
              </span>
              <div>
                <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>
                  {proc.content?.titleFR}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
                  {proc.content?.titleEN}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: '#ADB5BD' }}>
                {proc.content?.documentTypes?.join(', ')}
              </span>
              <ChevronRight size={14} style={{ color: '#ADB5BD' }} />
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  );
}
