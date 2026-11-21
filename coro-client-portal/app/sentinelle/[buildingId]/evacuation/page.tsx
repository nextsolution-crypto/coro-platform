'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, apiPut, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { AlertTriangle, Users, Flame, Info } from 'lucide-react';

// Dénombrement détaillé (audit M5-04, décision du 21 nov. 2026).
const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  EMPLOYE:     { label: 'Employé',     color: '#2980B9', bg: '#EBF5FB' },
  VISITEUR:    { label: 'Visiteur',    color: '#8E44AD', bg: '#F5EEF8' },
  CONTRACTEUR: { label: 'Contracteur', color: '#E67E22', bg: '#FEF5E7' },
};

type Status = 'PENDING' | 'PRESENT' | 'SAFE_ELSEWHERE' | 'INJURED' | 'MISSING' | 'FOUND';

const STATUS: Record<Status, { label: string; short: string; color: string; bg: string }> = {
  PENDING:        { label: 'À confirmer',                  short: 'À confirmer',   color: '#6C757D', bg: '#F1F3F5' },
  PRESENT:        { label: 'Présent au rassemblement',     short: 'Présent',       color: '#1E8449', bg: '#EAFAF1' },
  SAFE_ELSEWHERE: { label: 'En sécurité ailleurs',         short: 'En sécurité',   color: '#1F618D', bg: '#EBF5FB' },
  INJURED:        { label: 'Blessé ou besoin d’aide',      short: 'Blessé',        color: '#B9770E', bg: '#FEF5E7' },
  MISSING:        { label: 'Manquant — signalé aux pompiers', short: 'Manquant',   color: '#C0392B', bg: '#FDEDEC' },
  FOUND:          { label: 'Retrouvé',                     short: 'Retrouvé',      color: '#117A65', bg: '#E8F8F5' },
};

const ACTIONS: Status[] = ['PRESENT', 'SAFE_ELSEWHERE', 'INJURED', 'MISSING'];

type Filter = 'all' | 'todo' | 'missing' | 'accounted';

const statusOf = (c: any): Status => (c.status as Status) || (c.isAccountedFor ? 'PRESENT' : 'PENDING');
const time = (value?: string | null) =>
  value ? new Date(value).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' }) : '';

export default function EvacuationPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [evacuation, setEvacuation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<Filter>('todo');
  const [missingFor, setMissingFor] = useState<any>(null);
  const [missingLocation, setMissingLocation] = useState('');
  const [missingReported, setMissingReported] = useState(true);
  const [correctFor, setCorrectFor] = useState<any>(null);
  const [correctNote, setCorrectNote] = useState('');
  const [closing, setClosing] = useState(false);
  const [closureReason, setClosureReason] = useState('');
  const [resolving, setResolving] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  const fetchEvacuation = useCallback(async () => {
    try {
      const res = await apiGet(`/client-portal/buildings/${buildingId}/sentinelle/evacuation/active`);
      setEvacuation(res);
    } catch {
      setEvacuation(null);
    } finally {
      setLoading(false);
    }
  }, [buildingId]);

  useEffect(() => {
    if (!getUser()) { router.replace('/login'); return; }
    fetchEvacuation();
    const interval = setInterval(fetchEvacuation, 15000);
    return () => clearInterval(interval);
  }, [buildingId, fetchEvacuation, router]);

  const setStatus = async (
    checkin: any,
    status: Status,
    extra: { note?: string; lastKnownLocation?: string; reportedToFire?: boolean } = {},
  ) => {
    if (!evacuation) return;
    setBusyId(checkin.id);
    setMessage('');
    try {
      await apiPost(`/client-portal/buildings/${buildingId}/sentinelle/evacuations/${evacuation.id}/account`, {
        occupantRecordId: checkin.occupantRecordId,
        status,
        ...extra,
      });
      await fetchEvacuation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Mise à jour non enregistrée. Réessayez.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmMissing = async () => {
    if (!missingFor) return;
    const location = missingLocation.trim() || 'Inconnu';
    await setStatus(missingFor, 'MISSING', { lastKnownLocation: location, reportedToFire: missingReported });
    setMissingFor(null);
    setMissingLocation('');
    setMissingReported(true);
  };

  const confirmCorrection = async () => {
    if (!correctFor) return;
    await setStatus(correctFor, 'PENDING', { note: correctNote.trim() || 'Correction du responsable' });
    setCorrectFor(null);
    setCorrectNote('');
  };

  const unresolved = evacuation ? (evacuation.counts?.PENDING ?? 0) + (evacuation.counts?.MISSING ?? 0) : 0;

  const handleResolve = async () => {
    if (!evacuation) return;
    if (unresolved > 0 && closureReason.trim().length < 10) {
      setMessage('Indiquez le motif de clôture (10 caractères minimum) et l’heure de remise de la liste aux pompiers.');
      return;
    }
    setResolving(true);
    try {
      await apiPut(`/client-portal/buildings/${buildingId}/sentinelle/evacuations/${evacuation.id}/resolve`, {
        closureReason: closureReason.trim() || undefined,
      });
      router.push(`/sentinelle/${buildingId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Clôture non enregistrée.');
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

  if (!evacuation) {
    return (
      <PortalLayout>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <p style={{ fontSize: 48, margin: '0 0 16px' }}>✅</p>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#2C3E50' }}>Aucune évacuation active</h2>
          <p style={{ margin: '0 0 24px', color: '#6C757D', fontSize: 14 }}>
            Il n&apos;y a pas d&apos;évacuation en cours pour ce bâtiment.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/sentinelle/${buildingId}`)}
            style={{ padding: '12px 24px', borderRadius: 4, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            ← Retour au registre
          </button>
        </div>
      </PortalLayout>
    );
  }

  const checkins: any[] = evacuation.checkins || [];
  const counts: Record<Status, number> = evacuation.counts || { PENDING: 0, PRESENT: 0, SAFE_ELSEWHERE: 0, INJURED: 0, MISSING: 0, FOUND: 0 };
  const total = evacuation.totalPresent || checkins.length;
  const pct = total > 0 ? Math.round((evacuation.accounted / total) * 100) : 0;
  const brief = evacuation.fireBrief || { missing: [], injured: [], pending: [] };

  const filtered = checkins.filter((c) => {
    const s = statusOf(c);
    if (filter === 'todo') return s === 'PENDING';
    if (filter === 'missing') return s === 'MISSING' || s === 'INJURED';
    if (filter === 'accounted') return s === 'PRESENT' || s === 'SAFE_ELSEWHERE' || s === 'FOUND';
    return true;
  });

  const card: React.CSSProperties = { backgroundColor: '#FFFFFF', borderRadius: 6, border: '1px solid #E9ECEF' };
  const smallButton = (bg: string, color = '#FFFFFF'): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 4, border: 'none', backgroundColor: bg, color,
    fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  });

  return (
    <PortalLayout>
      {/* ── En-tête ── */}
      <header style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}
        >
          ← Retour au registre
        </button>
        <div style={{ padding: '16px 20px', borderRadius: 6, backgroundColor: '#FDEDEC', border: '2px solid #C0392B', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <AlertTriangle size={22} color="#C0392B" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#C0392B' }}>🚨 ÉVACUATION EN COURS</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>
              Déclenchée à {time(evacuation.triggeredAt)}{evacuation.triggeredBy ? ` par ${evacuation.triggeredBy}` : ''}
            </p>
          </div>
          <button type="button" onClick={() => setShowBrief((v) => !v)} style={smallButton('#C0392B')}>
            <Flame size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            {showBrief ? 'Masquer le bilan' : 'Bilan pour les pompiers'}
          </button>
          <button type="button" onClick={() => setClosing(true)} style={smallButton('#2C3E50')}>Clore l’évacuation</button>
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6C757D', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          Registre de pointage, pas un décompte physique : les personnes qui n’ont pas pointé n’y figurent pas. Faites aussi le tour des étages.
        </p>
      </header>

      {message && (
        <p role="alert" style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: 4, backgroundColor: '#FDEDEC', color: '#C0392B', fontSize: 13, fontWeight: 600 }}>
          {message}
        </p>
      )}

      {/* ── Bilan pour les pompiers ── */}
      {showBrief && (
        <section style={{ ...card, padding: '16px 20px', marginBottom: 16, borderColor: '#C0392B' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 900, color: '#C0392B' }}>Bilan pour les pompiers — {time(new Date().toISOString())}</h2>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#2C3E50' }}>
            {total} personne(s) au registre · {evacuation.accounted} localisée(s) · <strong>{counts.MISSING} manquante(s)</strong> · {counts.INJURED} blessée(s) · {counts.PENDING} à confirmer
          </p>
          {[
            { title: 'Manquants', list: brief.missing, color: '#C0392B' },
            { title: 'Blessés ou besoin d’aide', list: brief.injured, color: '#B9770E' },
            { title: 'Encore à confirmer', list: brief.pending, color: '#6C757D' },
          ].map((group) => (
            <div key={group.title} style={{ marginBottom: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 800, color: group.color, textTransform: 'uppercase' }}>{group.title} ({group.list.length})</p>
              {group.list.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: '#ADB5BD' }}>Aucun.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#2C3E50' }}>
                  {group.list.map((p: any) => (
                    <li key={p.occupantRecordId}>
                      <strong>{p.name}</strong>{p.type ? ` (${TYPE_LABELS[p.type]?.label ?? p.type})` : ''}
                      {p.lastKnownLocation ? ` — dernier emplacement : ${p.lastKnownLocation}` : p.floor ? ` — étage déclaré : ${p.floor}` : ''}
                      {p.reportedToFireAt ? ` — signalé à ${time(p.reportedToFireAt)}` : ''}
                      {p.note ? ` — ${p.note}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          <button type="button" onClick={() => window.print()} style={smallButton('#2C3E50')}>Imprimer</button>
        </section>
      )}

      {/* ── Compteurs ── */}
      <div style={{ ...card, marginBottom: 16, padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, color: '#6C757D', fontWeight: 600 }}>Personnes localisées</p>
            <p style={{ margin: '2px 0 0', fontSize: 28, fontWeight: 900, color: '#2C3E50', lineHeight: 1 }}>
              {evacuation.accounted} <span style={{ fontSize: 16, color: '#ADB5BD', fontWeight: 500 }}>/ {total}</span>
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 32, fontWeight: 900, color: pct === 100 ? '#27AE60' : '#C0392B' }}>{pct}%</p>
        </div>
        <div style={{ height: 10, backgroundColor: '#F1F3F5', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, backgroundColor: pct === 100 ? '#27AE60' : '#C0392B', width: `${pct}%`, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {(Object.keys(STATUS) as Status[]).map((s) => (
            <span key={s} style={{ padding: '4px 8px', borderRadius: 4, backgroundColor: STATUS[s].bg, color: STATUS[s].color, fontSize: 12, fontWeight: 700 }}>
              {STATUS[s].short} : {counts[s] ?? 0}
            </span>
          ))}
        </div>
      </div>

      {/* ── Filtres ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {([
          { key: 'todo', label: `À confirmer (${counts.PENDING})` },
          { key: 'missing', label: `Manquants et blessés (${counts.MISSING + counts.INJURED})` },
          { key: 'accounted', label: `Localisés (${counts.PRESENT + counts.SAFE_ELSEWHERE + counts.FOUND})` },
          { key: 'all', label: `Tous (${checkins.length})` },
        ] as { key: Filter; label: string }[]).map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            style={{
              padding: '8px 14px', borderRadius: 4, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid',
              borderColor: filter === f.key ? '#2C3E50' : '#E9ECEF',
              backgroundColor: filter === f.key ? '#2C3E50' : '#FFFFFF',
              color: filter === f.key ? '#FFFFFF' : '#6C757D',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Liste ── */}
      <section style={{ ...card, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Users size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucune personne dans cette catégorie.</p>
          </div>
        ) : (
          filtered.map((c: any, i: number) => {
            const r = c.occupantRecord;
            if (!r) return null;
            const cfg = TYPE_LABELS[r.type] || TYPE_LABELS.VISITEUR;
            const s = statusOf(c);
            const st = STATUS[s];
            const busy = busyId === c.id;
            return (
              <div key={c.id} style={{ padding: '12px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', opacity: busy ? 0.6 : 1 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>
                    {r.firstName} {r.lastName}
                    <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, backgroundColor: st.bg, color: st.color, fontSize: 11, fontWeight: 800 }}>{st.label}</span>
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD' }}>
                    {cfg.label}{r.company ? ` · ${r.company}` : ''}{r.floor ? ` · Étage ${r.floor}` : ''}
                    {c.lastKnownLocation ? ` · Dernier emplacement : ${c.lastKnownLocation}` : ''}
                  </p>
                  {s !== 'PENDING' && c.checkedBy && (
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6C757D' }}>
                      {c.checkedBy}, {time(c.checkedAt)}{c.reportedToFireAt ? ` · signalé aux pompiers à ${time(c.reportedToFireAt)}` : ''}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s === 'MISSING' ? (
                    <button type="button" disabled={busy} onClick={() => setStatus(c, 'FOUND')} style={smallButton('#117A65')}>Retrouvé</button>
                  ) : s === 'PENDING' ? (
                    ACTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        disabled={busy}
                        onClick={() => (a === 'MISSING' ? setMissingFor(c) : setStatus(c, a))}
                        style={smallButton(STATUS[a].color)}
                      >
                        {STATUS[a].short}
                      </button>
                    ))
                  ) : null}
                  {s !== 'PENDING' && (
                    <button type="button" disabled={busy} onClick={() => setCorrectFor(c)} style={smallButton('#F1F3F5', '#2C3E50')}>Corriger</button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ── Fenêtre : personne manquante ── */}
      {missingFor && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ ...card, padding: 20, maxWidth: 440, width: '100%' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#C0392B' }}>Personne manquante</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#2C3E50' }}>{missingFor.occupantRecord?.firstName} {missingFor.occupantRecord?.lastName}</p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#6C757D', marginBottom: 4 }}>Dernier emplacement connu (étage, zone, local)</label>
            <input
              value={missingLocation}
              onChange={(e) => setMissingLocation(e.target.value)}
              placeholder="Ex. : 3e étage, salle 304 — ou « inconnu »"
              maxLength={200}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #DEE2E6', fontSize: 14, boxSizing: 'border-box' }}
            />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 13, color: '#2C3E50' }}>
              <input type="checkbox" checked={missingReported} onChange={(e) => setMissingReported(e.target.checked)} />
              Signalé aux pompiers maintenant
            </label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setMissingFor(null)} style={smallButton('#F1F3F5', '#2C3E50')}>Annuler</button>
              <button type="button" onClick={confirmMissing} style={smallButton('#C0392B')}>Enregistrer manquant</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fenêtre : correction ── */}
      {correctFor && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ ...card, padding: 20, maxWidth: 440, width: '100%' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#2C3E50' }}>Corriger le dénombrement</h3>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6C757D' }}>
              {correctFor.occupantRecord?.firstName} {correctFor.occupantRecord?.lastName} repasse « à confirmer ». La correction est conservée au journal.
            </p>
            <input
              value={correctNote}
              onChange={(e) => setCorrectNote(e.target.value)}
              placeholder="Motif (ex. : coché par erreur)"
              maxLength={500}
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #DEE2E6', fontSize: 14, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setCorrectFor(null)} style={smallButton('#F1F3F5', '#2C3E50')}>Annuler</button>
              <button type="button" onClick={confirmCorrection} style={smallButton('#2C3E50')}>Enregistrer la correction</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fenêtre : clôture ── */}
      {closing && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
          <div style={{ ...card, padding: 20, maxWidth: 480, width: '100%' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, color: '#2C3E50' }}>Clore l’évacuation</h3>
            {unresolved > 0 ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 13, color: '#C0392B', fontWeight: 700 }}>
                  {counts.PENDING} à confirmer et {counts.MISSING} manquant(s). Un motif est obligatoire.
                </p>
                <textarea
                  value={closureReason}
                  onChange={(e) => setClosureReason(e.target.value)}
                  placeholder="Ex. : liste remise au capitaine des pompiers à 10 h 12 ; recherche prise en charge par le SSI."
                  maxLength={1000}
                  rows={4}
                  style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #DEE2E6', fontSize: 14, boxSizing: 'border-box' }}
                />
              </>
            ) : (
              <p style={{ margin: '0 0 10px', fontSize: 13, color: '#1E8449', fontWeight: 700 }}>Toutes les personnes du registre sont localisées.</p>
            )}
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6C757D' }}>Cette action est définitive.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" onClick={() => setClosing(false)} style={smallButton('#F1F3F5', '#2C3E50')}>Annuler</button>
              <button type="button" disabled={resolving} onClick={handleResolve} style={smallButton('#2C3E50')}>{resolving ? 'Clôture…' : 'Clore'}</button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
