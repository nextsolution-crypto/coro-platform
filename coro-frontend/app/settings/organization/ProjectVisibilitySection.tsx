'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import InfoTip from '@/components/ui/InfoTip';

type Visibility = 'OPEN' | 'RESTRICTED';

const OPTIONS: Array<{ value: Visibility; title: string; help: string }> = [
  {
    value: 'OPEN',
    title: 'Ouverte',
    help: 'Tous les conseillers voient tous les projets en lecture. Chacun ne modifie que les siens.',
  },
  {
    value: 'RESTRICTED',
    title: 'Restreinte',
    help: 'Un conseiller voit ses projets, ceux des clients dont il fait partie de l’équipe (fiche client), ceux où il est affecté à une activité ou à une tâche, et les documents à approuver. Les administrateurs et la coordination voient tout.',
  },
];

// Réglage d'organisation : qui voit quels projets. Modifiable par l'administrateur.
export default function ProjectVisibilitySection() {
  const [value, setValue] = useState<Visibility>('OPEN');
  const [saved, setSaved] = useState<Visibility>('OPEN');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/organizations/me/project-visibility')
      .then(response => { setValue(response.data.projectVisibility); setSaved(response.data.projectVisibility); })
      .catch(() => setError('Impossible de charger la visibilité des projets.'));
  }, []);

  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const response = await api.put('/organizations/me/project-visibility', { projectVisibility: value });
      setSaved(response.data.projectVisibility);
      setMessage('Visibilité enregistrée. Elle s’applique dès la prochaine page consultée par chaque conseiller.');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Impossible d’enregistrer la visibilité.');
    } finally { setSaving(false); }
  };

  return (
    <section className="rounded-lg p-4 sm:p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
      <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Visibilité des projets<InfoTip text="Ouverte : chacun lit tous les projets. Restreinte : chacun voit ses projets, ceux de ses clients (équipe du client), ses affectations et les documents à approuver." manual="visibilite-equipe-client" /></h3>
      <p className="text-xs mb-4" style={{ color: '#6C757D' }}>
        Détermine quels projets, portefeuilles clients et documents les conseillers peuvent consulter.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Visibilité des projets">
        {OPTIONS.map(option => (
          <label key={option.value} className="block rounded p-3 cursor-pointer"
            style={{ border: `1px solid ${value === option.value ? '#C0392B' : '#DEE2E6'}`, backgroundColor: value === option.value ? '#FDEDEC' : '#FFFFFF' }}>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#2C3E50' }}>
              <input type="radio" name="project-visibility" value={option.value}
                checked={value === option.value} onChange={() => setValue(option.value)} />
              {option.title}{saved === option.value ? ' (actuelle)' : ''}
            </span>
            <span className="block text-xs mt-1" style={{ color: '#6C757D' }}>{option.help}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button type="button" onClick={save} disabled={saving || value === saved}
          className="px-4 py-2 rounded text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#C0392B' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer la visibilité'}
        </button>
        {message && <span className="text-xs" style={{ color: '#27AE60' }}>{message}</span>}
        {error && <span className="text-xs" role="alert" style={{ color: '#C0392B' }}>{error}</span>}
      </div>
    </section>
  );
}
