'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import api from '@/lib/api';
import { toast } from '@/lib/toast';

type SessionInfo = {
  token: string;
  title: string;
  passingPercent: number;
  questionCount: number;
  isOpen: boolean;
  participants: number;
  averagePercent: number | null;
  passRate: number | null;
  responses: Array<{
    id: string;
    participantName: string;
    correctCount: number;
    totalCount: number;
    percent: number;
    passed: boolean;
    submittedAt: string;
  }>;
};

type QuestionnaireState = {
  trainingType: boolean;
  available: boolean;
  canManage: boolean;
  session: SessionInfo | null;
};

/** Adresse publique du questionnaire, sur le portail client (même environnement). */
export function questionnaireUrl(token: string) {
  if (typeof window === 'undefined') return `https://client.getcoro.io/questionnaire/${token}`;
  const { protocol, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return `${protocol}//${hostname}:3001/questionnaire/${token}`;
  const host = hostname.startsWith('app.') ? `client.${hostname.slice(4)}` : 'client.getcoro.io';
  return `https://${host}/questionnaire/${token}`;
}

/** Questionnaire post-formation : code QR à projeter et résultats des participants. */
export default function TrainingQuestionnaireModal({
  activityId,
  activityLabel,
  onClose,
}: {
  activityId: string;
  activityLabel: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<QuestionnaireState | null>(null);
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get(`/activities/${activityId}/questionnaire`);
      setState(response.data);
    } catch {
      toast('Le questionnaire ne peut pas être chargé.', 'error');
    }
  }, [activityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = state?.session?.token;
    if (!token) return setQr('');
    void QRCode.toDataURL(questionnaireUrl(token), { width: 280, margin: 1 }).then(setQr);
  }, [state?.session?.token]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const act = async (action: 'open' | 'close') => {
    setBusy(true);
    try {
      const response = await api.post(`/activities/${activityId}/questionnaire/${action}`);
      setState(response.data);
      toast(action === 'open' ? 'Questionnaire ouvert.' : 'Questionnaire fermé.', 'success');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Action impossible.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const session = state?.session;
  const url = session ? questionnaireUrl(session.token) : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(44, 62, 80, 0.45)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-questionnaire-title"
        className="w-full max-w-2xl rounded-md bg-white p-6"
        style={{ maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.18)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="training-questionnaire-title" className="text-lg font-bold" style={{ color: '#2C3E50' }}>
              Questionnaire post-formation
            </h2>
            <p className="text-sm" style={{ color: '#6C757D' }}>{activityLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded px-3 py-1.5 text-sm" style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
            Fermer
          </button>
        </div>

        {!state && <p className="text-sm" style={{ color: '#ADB5BD' }}>Chargement…</p>}

        {state && !state.available && !session && (
          <p className="text-sm" style={{ color: '#6C757D' }}>
            Aucun questionnaire n’est défini pour ce type de formation. Un administrateur peut en créer un dans Paramètres → Questionnaires de formation.
          </p>
        )}

        {state && state.available && !session && (
          <div className="rounded-md p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
            <p className="mb-3 text-sm" style={{ color: '#2C3E50' }}>
              À la fin de la formation, ouvrez le questionnaire et projetez le code QR : les participants répondent sur leur téléphone, sans compte. Le score de chacun s’affiche ici et alimente l’indice CORO du bâtiment.
            </p>
            {state.canManage ? (
              <button type="button" disabled={busy} onClick={() => void act('open')} className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#C0392B' }}>
                Ouvrir le questionnaire
              </button>
            ) : (
              <p className="text-xs" style={{ color: '#6C757D' }}>Le responsable du projet ou le conseiller affecté peut l’ouvrir.</p>
            )}
          </div>
        )}

        {session && (
          <>
            <div className="mb-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {session.isOpen && qr ? (
                <img src={qr} alt="Code QR du questionnaire" width={220} height={220} className="rounded" style={{ border: '1px solid #E9ECEF' }} />
              ) : (
                <div className="flex h-[220px] w-[220px] items-center justify-center rounded text-center text-sm" style={{ border: '1px dashed #CED4DA', color: '#ADB5BD' }}>
                  {session.isOpen ? 'Génération du code…' : 'Questionnaire fermé'}
                </div>
              )}
              <div className="flex-1 text-sm" style={{ color: '#2C3E50' }}>
                <p className="font-semibold">{session.title}</p>
                <p style={{ color: '#6C757D' }}>
                  {session.questionCount} questions · réussite à {session.passingPercent} %
                </p>
                <p className="mt-2 font-semibold" style={{ color: session.isOpen ? '#27AE60' : '#6C757D' }}>
                  {session.isOpen ? 'Ouvert aux réponses' : 'Fermé'}
                </p>
                {session.isOpen && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void navigator.clipboard?.writeText(url).then(() => toast('Lien copié.', 'success'))}
                      className="rounded px-3 py-1.5 text-xs"
                      style={{ border: '1px solid #AED6F1', color: '#2980B9' }}
                    >
                      Copier le lien
                    </button>
                    <a href={url} target="_blank" rel="noreferrer" className="rounded px-3 py-1.5 text-xs" style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                      Ouvrir en plein écran
                    </a>
                  </div>
                )}
                {state?.canManage && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void act(session.isOpen ? 'close' : 'open')}
                    className="mt-3 rounded px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                    style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}
                  >
                    {session.isOpen ? 'Fermer le questionnaire' : 'Rouvrir le questionnaire'}
                  </button>
                )}
              </div>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-3 text-center">
              {[
                ['Participants', String(session.participants)],
                ['Moyenne', session.averagePercent === null ? '—' : `${session.averagePercent} %`],
                ['Réussite', session.passRate === null ? '—' : `${session.passRate} %`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md p-3" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                  <p className="text-xs" style={{ color: '#6C757D' }}>{label}</p>
                  <p className="text-xl font-bold" style={{ color: '#2C3E50' }}>{value}</p>
                </div>
              ))}
            </div>

            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: '#2C3E50' }}>Résultats</p>
              <button type="button" onClick={() => void load()} className="text-xs underline" style={{ color: '#2980B9' }}>
                Actualiser
              </button>
            </div>
            {session.responses.length === 0 ? (
              <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucune réponse pour le moment.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase" style={{ color: '#6C757D' }}>
                    <th className="py-2">Participant</th>
                    <th className="py-2">Score</th>
                    <th className="py-2">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {session.responses.map((response) => (
                    <tr key={response.id} style={{ borderTop: '1px solid #E9ECEF' }}>
                      <td className="py-2" style={{ color: '#2C3E50' }}>{response.participantName}</td>
                      <td className="py-2">{response.correctCount}/{response.totalCount} ({response.percent} %)</td>
                      <td className="py-2 font-semibold" style={{ color: response.passed ? '#27AE60' : '#C0392B' }}>
                        {response.passed ? 'Réussi' : 'À revoir'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
