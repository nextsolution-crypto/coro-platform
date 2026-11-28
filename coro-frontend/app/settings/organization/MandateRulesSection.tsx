'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DEFAULT_MANDATE_RULES, type MandateRules } from '@/app/projects/[id]/mandate/mandateFormState';
import InfoTip from '@/components/ui/InfoTip';

const FIELDS: Array<{ key: keyof MandateRules; label: string; unit: string; help: string }> = [
  { key: 'mandateTargetMarginPercent', label: 'Marge visée', unit: '%',
    help: 'Heures budgétées = montant vendu × (100 % − marge) ÷ taux facturé.' },
  { key: 'mandateLongThresholdHours', label: 'Seuil d’un mandat long', unit: 'h',
    help: 'À partir de ce nombre d’heures budgétées, le délai long s’applique.' },
  { key: 'mandateShortDeliveryDays', label: 'Délai PMU/PSI — mandat court', unit: 'jours',
    help: 'Après le relevé technique, sous le seuil.' },
  { key: 'mandateLongDeliveryDays', label: 'Délai PMU/PSI — mandat long', unit: 'jours',
    help: 'Après le relevé technique, à partir du seuil.' },
  { key: 'evacuationPlanDeliveryDays', label: 'Délai plan d’évacuation', unit: 'jours',
    help: 'Après le relevé technique.' },
  { key: 'inspectionReportDeliveryDays', label: 'Délai rapport d’inspection', unit: 'jours',
    help: 'Après l’inspection (sécurité physique ou code).' },
];

// Règles des mandats de l'organisation : valeurs par défaut CORO, modifiables par l'administrateur.
export default function MandateRulesSection() {
  const [rules, setRules] = useState<MandateRules>(DEFAULT_MANDATE_RULES);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/organizations/me/mandate-rules')
      .then(response => setRules({ ...DEFAULT_MANDATE_RULES, ...response.data }))
      .catch(() => setError('Impossible de charger les règles des mandats.'));
  }, []);

  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const response = await api.put('/organizations/me/mandate-rules', rules);
      setRules({ ...DEFAULT_MANDATE_RULES, ...response.data });
      setMessage('Règles enregistrées. Elles s’appliquent aux prochains enregistrements de mandat.');
    } catch (err: unknown) {
      const apiMessage = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
      setError(typeof apiMessage === 'string' ? apiMessage : 'Impossible d’enregistrer les règles.');
    } finally { setSaving(false); }
  };

  return (
    <section className="rounded-lg p-4 sm:p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>
      <h3 className="font-semibold mb-1" style={{ color: '#2C3E50' }}>Règles des mandats<InfoTip text="Valeurs par défaut de CORO, propres à votre organisation. Elles s’appliquent aux prochains enregistrements de mandat, pas aux mandats déjà enregistrés." manual="mandat-services" /></h3>
      <p className="text-xs mb-4" style={{ color: '#6C757D' }}>
        Utilisées pour calculer les heures budgétées et la date limite de livraison de chaque mandat.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(field => (
          <label key={field.key} className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#6C757D' }}>{field.label}</span>
            <span className="flex items-center gap-2">
              <input type="number" min={0} step={1} value={rules[field.key]}
                onChange={e => setRules({ ...rules, [field.key]: Math.round(Number(e.target.value)) })}
                className="w-28 px-3 py-2 rounded text-sm" style={{ border: '1px solid #CED4DA' }} />
              <span className="text-sm" style={{ color: '#6C757D' }}>{field.unit}</span>
            </span>
            <span className="block text-xs mt-1" style={{ color: '#ADB5BD' }}>{field.help}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-4 flex-wrap">
        <button type="button" onClick={save} disabled={saving}
          className="px-4 py-2 rounded text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: '#C0392B' }}>
          {saving ? 'Enregistrement…' : 'Enregistrer les règles'}
        </button>
        {message && <span className="text-xs" style={{ color: '#27AE60' }}>{message}</span>}
        {error && <span className="text-xs" role="alert" style={{ color: '#C0392B' }}>{error}</span>}
      </div>
    </section>
  );
}
