'use client';
import { useEffect, useState } from 'react';
import { apiGet } from '../../store/auth';

// Bouton panique par type (décision du 21 nov. 2026, audit M2-05).

export type PanicType = 'THREAT' | 'MEDICAL' | 'FIRE' | 'OTHER';
export type PanicScope = 'TEAM' | 'BUILDING';

const TILES: { type: PanicType; icon: string; fr: string; en: string; hint: string }[] = [
  { type: 'THREAT', icon: '⚠️', fr: 'Menace ou violence', en: 'Threat or violence', hint: 'Personne armée, agression, comportement menaçant' },
  { type: 'MEDICAL', icon: '🩺', fr: 'Urgence médicale', en: 'Medical emergency', hint: 'Malaise, blessure, personne inconsciente' },
  { type: 'FIRE', icon: '🔥', fr: 'Feu ou fumée', en: 'Fire or smoke', hint: 'Flammes, fumée, odeur de brûlé' },
  { type: 'OTHER', icon: '🚨', fr: 'Autre urgence', en: 'Other emergency', hint: 'Toute autre situation urgente' },
];

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
};
const sheet: React.CSSProperties = {
  backgroundColor: '#FFFFFF', borderRadius: 6, maxWidth: 480, width: '100%', overflow: 'hidden',
  boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '92vh', overflowY: 'auto',
};

export function PanicChooser(props: {
  onSend: (type: PanicType, scope: PanicScope) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<'type' | 'scope'>('type');

  return (
    <div data-cg-emergency="" role="dialog" aria-modal="true" aria-labelledby="panic-confirm-title" style={overlay}>
      <div style={sheet}>
        <div style={{ backgroundColor: '#C0392B', padding: '18px 22px', textAlign: 'center' }}>
          <p id="panic-confirm-title" style={{ margin: 0, fontSize: 19, fontWeight: 900, color: '#FFFFFF' }}>
            {step === 'type' ? 'QUELLE URGENCE ? · WHAT EMERGENCY?' : 'MENACE : QUI ALERTER ? · WHO TO ALERT?'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#F5B7B1' }}>
            {step === 'type' ? 'Un toucher envoie l’alerte. · One tap sends the alert.' : 'Un toucher envoie l’alerte. · One tap sends the alert.'}
          </p>
        </div>
        <div style={{ padding: 16 }}>
          {step === 'type' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {TILES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  autoFocus={t.type === 'THREAT'}
                  onClick={() => (t.type === 'THREAT' ? setStep('scope') : props.onSend(t.type, 'TEAM'))}
                  aria-label={`${t.fr} · ${t.en}`}
                  style={{
                    minHeight: 120, padding: 12, borderRadius: 6, border: '2px solid #C0392B',
                    backgroundColor: '#FDEDEC', color: '#2C3E50', cursor: 'pointer', textAlign: 'center',
                  }}
                >
                  <span style={{ display: 'block', fontSize: 34 }}>{t.icon}</span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: '#C0392B' }}>{t.fr}</span>
                  <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D' }}>{t.en}</span>
                  <span style={{ display: 'block', fontSize: 10, color: '#ADB5BD', marginTop: 4 }}>{t.hint}</span>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                autoFocus
                onClick={() => props.onSend('THREAT', 'TEAM')}
                style={{ padding: 16, borderRadius: 6, border: '2px solid #2C3E50', backgroundColor: '#F8F9FA', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ display: 'block', fontSize: 16, fontWeight: 900, color: '#2C3E50' }}>🤫 Alerte silencieuse · Silent alert</span>
                <span style={{ display: 'block', fontSize: 12, color: '#6C757D', marginTop: 4 }}>
                  Équipe d’urgence et responsables seulement. Pour une situation qui commence calmement (visiteur agressif, menace verbale).
                </span>
              </button>
              <button
                type="button"
                onClick={() => props.onSend('THREAT', 'BUILDING')}
                style={{ padding: 16, borderRadius: 6, border: '2px solid #C0392B', backgroundColor: '#FDEDEC', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ display: 'block', fontSize: 16, fontWeight: 900, color: '#C0392B' }}>📢 Alerter tout le bâtiment · Alert everyone</span>
                <span style={{ display: 'block', fontSize: 12, color: '#6C757D', marginTop: 4 }}>
                  Équipe + employés présents qui ont consenti aux SMS : « fuyez si possible, sinon cachez-vous ».
                </span>
              </button>
              <button type="button" onClick={() => setStep('type')} style={{ padding: 10, borderRadius: 4, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, cursor: 'pointer' }}>
                ← Autre type d’urgence
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={props.onCancel}
            style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 4, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Annuler · Cancel
          </button>
          <a href="tel:911" style={{ display: 'block', textAlign: 'center', marginTop: 10, fontSize: 13, color: '#C0392B', fontWeight: 800 }}>
            Danger immédiat ? Appelez directement le 911
          </a>
        </div>
      </div>
    </div>
  );
}

const RESPONSE_LABELS: Record<string, { label: string; color: string }> = {
  TAKING_CHARGE: { label: 'Prend en charge', color: '#1E8449' },
  SAFE: { label: 'En sécurité', color: '#1F618D' },
  NEED_HELP: { label: 'Besoin d’aide', color: '#C0392B' },
};

/** Suivi en direct des réponses (toutes les 5 s pendant 30 min). */
export function PanicResponses(props: { buildingId: string; panicAlertId: string }) {
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    const load = async () => {
      try {
        const res = await apiGet(`/client-portal/buildings/${props.buildingId}/panic/${props.panicAlertId}`);
        if (!stopped) setStatus(res);
      } catch {
        /* le suivi est un complément : l'écran garde le bouton 911 */
      }
    };
    load();
    const timer = setInterval(() => {
      if (Date.now() - started > 30 * 60_000) return clearInterval(timer);
      load();
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [props.buildingId, props.panicAlertId]);

  if (!status) return null;
  const team = (status.recipients || []).filter((r: any) => r.audience === 'TEAM');
  const occupants = (status.recipients || []).filter((r: any) => r.audience === 'OCCUPANT');
  const taking = team.filter((r: any) => r.response === 'TAKING_CHARGE');
  const help = (status.recipients || []).filter((r: any) => r.response === 'NEED_HELP');

  return (
    <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 6, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: '#2C3E50', textTransform: 'uppercase' }}>Réponses en direct · Live responses</p>
      {taking.length > 0 ? (
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 800, color: '#1E8449' }}>
          ✅ {taking.map((r: any) => r.name).join(', ')} prend{taking.length > 1 ? 'nent' : ''} en charge
        </p>
      ) : (
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#B9770E' }}>Personne n’a encore pris en charge.</p>
      )}
      {help.length > 0 && (
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 800, color: '#C0392B' }}>
          🆘 Besoin d’aide : {help.map((r: any) => r.name).join(', ')}
        </p>
      )}
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {team.map((r: any) => (
          <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, padding: '3px 0', color: '#2C3E50' }}>
            <span>{r.name}{r.role ? ` · ${r.role}` : ''}</span>
            <span style={{ fontWeight: 700, color: r.response ? RESPONSE_LABELS[r.response]?.color : (r.emailAccepted || r.smsAccepted) ? '#6C757D' : '#C0392B' }}>
              {r.response ? RESPONSE_LABELS[r.response]?.label : (r.emailAccepted || r.smsAccepted) ? 'Reçu, pas de réponse' : 'Envoi refusé'}
            </span>
          </li>
        ))}
      </ul>
      {occupants.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6C757D' }}>
          Occupants : {occupants.filter((r: any) => r.response === 'SAFE').length} en sécurité, {occupants.filter((r: any) => r.response === 'NEED_HELP').length} besoin d’aide, {occupants.filter((r: any) => !r.response).length} sans réponse, sur {occupants.length}.
        </p>
      )}
    </div>
  );
}
