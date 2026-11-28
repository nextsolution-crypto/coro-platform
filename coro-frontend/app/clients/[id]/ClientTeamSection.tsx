'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import InfoTip from '@/components/ui/InfoTip';

type Advisor = { id: string; email: string; firstName: string; lastName: string };
type Member = { userId: string; name: string; email: string };

// Équipe du client : conseillers rattachés. En visibilité « Restreinte », ils voient tous
// les projets, bâtiments et activités de ce client, y compris les futurs.
export default function ClientTeamSection({ clientId }: { clientId: string }) {
  const user = useAuthStore(state => state.user);
  const canEdit = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') || !!user?.planningCoordinator;
  const [members, setMembers] = useState<Member[]>([]);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [visibility, setVisibility] = useState<string>('OPEN');

  const load = async () => {
    try {
      const [team, vis] = await Promise.all([
        api.get<Member[]>(`/clients/${clientId}/team`),
        api.get('/organizations/me/project-visibility').catch(() => ({ data: { projectVisibility: 'OPEN' } })),
      ]);
      setMembers(team.data || []);
      setSelected((team.data || []).map(member => member.userId));
      setVisibility(vis.data.projectVisibility);
    } catch { setError('Impossible de charger l’équipe du client.'); }
  };

  useEffect(() => { load(); }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = async () => {
    setEditing(true); setError('');
    if (!advisors.length) {
      try { setAdvisors((await api.get<Advisor[]>('/users/organization/advisors')).data || []); }
      catch { setError('Impossible de charger les conseillers.'); }
    }
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.put(`/clients/${clientId}/team`, { userIds: selected });
      setEditing(false);
      await load();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(typeof message === 'string' ? message : 'Impossible d’enregistrer l’équipe.');
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-md p-4 sm:p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-semibold" style={{ color: '#2C3E50' }}>Équipe du client<InfoTip text="Conseillers attitrés à ce client. En visibilité Restreinte, ils voient tous ses projets, y compris les futurs, sans être ajoutés projet par projet." manual="visibilite-equipe-client" /></h3>
        {canEdit && !editing && (
          <button type="button" onClick={startEdit} className="rounded px-3 py-1.5 text-sm font-medium"
            style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>Modifier</button>
        )}
      </div>
      <p className="text-xs mb-3" style={{ color: '#6C757D' }}>
        {visibility === 'RESTRICTED'
          ? 'Ces conseillers voient tous les projets, bâtiments et activités de ce client, y compris les futurs.'
          : 'Conseillers attitrés à ce client. En visibilité « Restreinte » (Paramètres → Organisation), ils garderont l’accès à tous ses projets.'}
      </p>
      {!editing ? (
        members.length ? (
          <ul className="flex flex-wrap gap-2">
            {members.map(member => (
              <li key={member.userId} className="text-xs px-2.5 py-1 rounded-full" title={member.email}
                style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF', color: '#2C3E50' }}>👤 {member.name}</li>
            ))}
          </ul>
        ) : <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun conseiller rattaché.</p>
      ) : (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-3">
            {advisors.map(advisor => (
              <label key={advisor.id} className="flex items-center gap-2 text-sm" style={{ color: '#2C3E50' }}>
                <input type="checkbox" checked={selected.includes(advisor.id)}
                  onChange={e => setSelected(current => e.target.checked ? [...current, advisor.id] : current.filter(id => id !== advisor.id))} />
                {`${advisor.firstName} ${advisor.lastName}`.trim() || advisor.email}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving} className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: '#C0392B' }}>{saving ? 'Enregistrement…' : 'Enregistrer l’équipe'}</button>
            <button type="button" onClick={() => { setEditing(false); setSelected(members.map(member => member.userId)); }}
              className="rounded px-4 py-2 text-sm" style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>Annuler</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs mt-2" style={{ color: '#C0392B' }}>{error}</p>}
    </div>
  );
}
