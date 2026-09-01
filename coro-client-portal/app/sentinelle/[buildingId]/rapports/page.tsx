'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { FileText, CheckCircle, AlertTriangle } from 'lucide-react';

export default function RapportsPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [evacuations, setEvacuations] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchEvacuations();
  }, [buildingId]);

  const fetchEvacuations = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/occupancy/buildings/${buildingId}/evacuation/history`);
      setEvacuations(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await apiGet(`/occupancy/evacuation/${id}/detail`);
      setSelected(res);
    } catch (err) { console.error(err); }
    finally { setLoadingDetail(false); }
  };

  const handleExportPDF = () => {
    if (!selected) return;
    const win = window.open('', '_blank');
    if (!win) return;

    const dateEvac = new Date(selected.triggeredAt).toLocaleString('fr-CA', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const duration = selected.durationMinutes ? `${selected.durationMinutes} minutes` : 'En cours';
    const pct = selected.totalPresent > 0
      ? Math.round((selected.accounted / selected.totalPresent) * 100)
      : 0;

    const allRows = selected.checkins.map((c: any) => `
      <tr>
        <td>${c.occupantRecord?.firstName || ''} ${c.occupantRecord?.lastName || ''}</td>
        <td>${c.occupantRecord?.type || ''}</td>
        <td>${c.occupantRecord?.company || '—'}</td>
        <td style="color:${c.isAccountedFor ? '#27AE60' : '#C0392B'};font-weight:700;">
          ${c.isAccountedFor ? '✅ Comptabilisé' : '⚠️ Non comptabilisé'}
        </td>
        <td>${c.checkedBy || '—'}</td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <title>Rapport d'évacuation — ${selected.building?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 40px; color: #2C3E50; }
          .header { background: #2C3E50; color: white; padding: 24px 32px; border-radius: 8px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: center; }
          .logo { font-size: 28px; font-weight: 900; }
          .logo span { color: #C0392B; }
          h2 { font-size: 16px; font-weight: 700; border-bottom: 2px solid #E9ECEF; padding-bottom: 8px; margin: 24px 0 16px; }
          .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
          .stat { background: #F8F9FA; border-radius: 8px; padding: 16px; text-align: center; }
          .stat-value { font-size: 32px; font-weight: 900; }
          .stat-label { font-size: 11px; color: #ADB5BD; text-transform: uppercase; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #F8F9FA; padding: 10px 12px; text-align: left; font-weight: 700; color: #6C757D; font-size: 11px; text-transform: uppercase; }
          td { padding: 10px 12px; border-bottom: 1px solid #F1F3F5; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E9ECEF; font-size: 11px; color: #ADB5BD; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="logo">CO<span>RO</span> Sentinelle</div>
            <div style="font-size:13px;color:#ADB5BD;margin-top:4px;">Rapport d'évacuation officiel</div>
          </div>
          <div style="text-align:right;font-size:13px;color:#ADB5BD;">
            Généré le ${new Date().toLocaleDateString('fr-CA')}<br>
            ${selected.building?.name}
          </div>
        </div>
        <div class="stats">
          <div class="stat"><div class="stat-value">${selected.totalPresent}</div><div class="stat-label">Présents</div></div>
          <div class="stat"><div class="stat-value" style="color:#27AE60">${selected.accounted}</div><div class="stat-label">Comptabilisés</div></div>
          <div class="stat"><div class="stat-value" style="color:#C0392B">${selected.missing}</div><div class="stat-label">Manquants</div></div>
          <div class="stat"><div class="stat-value">${pct}%</div><div class="stat-label">Taux</div></div>
        </div>
        <h2>Informations générales</h2>
        <table>
          <tr><th>Bâtiment</th><td>${selected.building?.name} — ${selected.building?.address}, ${selected.building?.city}</td></tr>
          <tr><th>Date et heure</th><td>${dateEvac}</td></tr>
          <tr><th>Durée</th><td>${duration}</td></tr>
          <tr><th>Déclenché par</th><td>${selected.triggeredBy || '—'}</td></tr>
          <tr><th>Statut</th><td>${selected.status === 'RESOLVED' ? '✅ Résolu' : '🔴 En cours'}</td></tr>
          ${selected.notes ? `<tr><th>Notes</th><td>${selected.notes}</td></tr>` : ''}
        </table>
        <h2>Dénombrement complet</h2>
        <table>
          <thead><tr><th>Nom</th><th>Type</th><th>Entreprise</th><th>Statut</th><th>Comptabilisé par</th></tr></thead>
          <tbody>${allRows}</tbody>
        </table>
        <div class="footer">
          <span>CORO Sentinelle — Rapport confidentiel</span>
          <span>Conservation : 36 mois (ISO 22301)</span>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
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

  return (
    <PortalLayout>
      <header style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}>
          ← Retour au registre
        </button>
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
        <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50' }}>Rapports d&apos;évacuation</h1>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap: 20 }}>
        {/* Liste évacuations */}
        <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF' }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Évacuations</h2>
          </div>
          {evacuations.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <FileText size={28} color="#DEE2E6" style={{ margin: '0 auto 10px' }} />
              <p style={{ margin: 0, color: '#ADB5BD', fontSize: 13 }}>Aucune évacuation enregistrée.</p>
            </div>
          ) : (
            evacuations.map((evac, i) => {
              const isSelected = selected?.id === evac.id;
              const date = new Date(evac.triggeredAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' });
              const time = new Date(evac.triggeredAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
              return (
                <button key={evac.id} type="button" onClick={() => fetchDetail(evac.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '14px 20px', border: 'none',
                    borderBottom: i < evacuations.length - 1 ? '1px solid #F1F3F5' : 'none',
                    backgroundColor: isSelected ? '#F8F9FA' : '#FFFFFF',
                    cursor: 'pointer',
                    borderLeft: isSelected ? '3px solid #C0392B' : '3px solid transparent',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>🚨 {date} à {time}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#ADB5BD' }}>{evac.totalPresent} personnes présentes</p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      backgroundColor: evac.status === 'RESOLVED' ? '#EAFAF1' : '#FDEDEC',
                      color: evac.status === 'RESOLVED' ? '#27AE60' : '#C0392B',
                    }}>
                      {evac.status === 'RESOLVED' ? 'Résolu' : 'En cours'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* Détail */}
        {selected && (
          <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Rapport détaillé</h2>
              <button type="button" onClick={handleExportPDF}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <FileText size={13} /> Exporter PDF
              </button>
            </div>
            {loadingDetail ? (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
              </div>
            ) : (
              <div style={{ padding: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Présents', value: selected.totalPresent, color: '#2C3E50' },
                    { label: 'Comptabilisés', value: selected.accounted, color: '#27AE60' },
                    { label: 'Manquants', value: selected.missing, color: '#C0392B' },
                    { label: 'Durée', value: selected.durationMinutes ? `${selected.durationMinutes}m` : '—', color: '#6C757D' },
                  ].map(s => (
                    <div key={s.label} style={{ backgroundColor: '#F8F9FA', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#ADB5BD', textTransform: 'uppercase' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.checkins.map((c: any) => {
                    const r = c.occupantRecord;
                    if (!r) return null;
                    return (
                      <div key={c.id} style={{
                        padding: '10px 14px', borderRadius: 8,
                        backgroundColor: c.isAccountedFor ? '#EAFAF1' : '#FDEDEC',
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        {c.isAccountedFor
                          ? <CheckCircle size={16} color="#27AE60" style={{ flexShrink: 0 }} />
                          : <AlertTriangle size={16} color="#C0392B" style={{ flexShrink: 0 }} />
                        }
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{r.firstName} {r.lastName}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6C757D' }}>{r.type}{r.company ? ` · ${r.company}` : ''}</p>
                        </div>
                        {c.isAccountedFor && c.checkedBy && (
                          <p style={{ margin: 0, fontSize: 11, color: '#27AE60' }}>par {c.checkedBy}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </PortalLayout>
  );
}