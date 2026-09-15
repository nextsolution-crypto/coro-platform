'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, MapPin, ShieldAlert, Flame, Users, KeyRound, Wrench, Accessibility, Phone } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const INCIDENT_LABELS: Record<string, string> = {
  SMOKE_DISCOVERY: 'Découverte de fumée', FIRE_ALERT: 'Alerte incendie',
  FIRE_ALARM: 'Alarme incendie', GAS_LEAK: 'Fuite de gaz',
  ACTIVE_THREAT: 'Menace active / Confinement', MEDICAL: 'Urgence médicale',
  TOXIC_GAS: 'Gaz toxique', SUSPICIOUS_PACKAGE: 'Colis suspect',
  POWER_OUTAGE: 'Coupure de courant', HAZMAT: 'Matières dangereuses',
  BOMB_THREAT: 'Alerte à la bombe', LITHIUM_BATTERY: 'Batterie lithium-ion',
  FLOODING: 'Inondations', VIOLENT_WINDS: 'Vents violents', OTHER: 'Incident',
};

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #E9ECEF', display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#F8F9FA' }}>
        {icon}
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#2C3E50' }}>{title}</h2>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid #F8F9FA' }}>
      <span style={{ fontSize: 12, color: '#6C757D', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#2C3E50', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function InterventionSheetPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/occupancy/intervention-access/${token}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.message || 'Lien invalide ou expiré.');
        }
        return r.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#ADB5BD', fontSize: 14 }} className="animate-pulse">Chargement de la fiche...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#2C3E50', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
        <AlertTriangle size={40} color="#E67E22" style={{ marginBottom: 16 }} />
        <h1 style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>Fiche non disponible</h1>
        <p style={{ color: '#ADB5BD', fontSize: 14, maxWidth: 320 }}>
          {error || 'Ce lien est invalide.'} Si l\'incident est toujours en cours, contactez le coordonnateur d\'urgence du bâtiment.
        </p>
      </div>
    );
  }

  const sheet = data.sheet || {};
  const team: any[] = Array.isArray(data.team) ? data.team : [];
  const label = INCIDENT_LABELS[data.incidentType] || data.incidentType;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8F9FA' }}>
      {/* Bandeau incident */}
      <div style={{ backgroundColor: '#C0392B', padding: '20px 20px 24px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 900, color: '#FFF0EE', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Fiche d'intervention · Accès temporaire
        </p>
        <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>🚨 {label}</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>
          {sheet.building?.name || data.building?.name}
          {data.building?.address && ` · ${data.building.address}`}
        </p>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 16px 60px' }}>

        {data.assemblyPoint && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF', borderRadius: 10, marginBottom: 16 }}>
            <MapPin size={20} color="#27AE60" />
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#27AE60', textTransform: 'uppercase' }}>Point de rassemblement</p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: '#1E7E4A' }}>{data.assemblyPoint}</p>
            </div>
          </div>
        )}

        <Section icon={<KeyRound size={14} color="#2C3E50" />} title="Accès">
          <Row label="Poste de commandement" value={sheet.acces?.posteCommandement} />
          <Row label="Boîte à clés pompier" value={sheet.acces?.boiteClePompier} />
          <Row label="Trousseau de clés pompier" value={sheet.acces?.trousseClesPompierLieu} />
          <Row label="Raccord pompier" value={sheet.acces?.raccordPompierLieu} />
          <Row label="Bornes-fontaines" value={sheet.acces?.bornesFontaineLieu} />
          <Row label="Vannes d'isolement" value={sheet.acces?.vannesIsolementLieu} />
          <Row label="Ascenseur pompier" value={sheet.acces?.ascenseurPompier} />
          {!sheet.acces?.posteCommandement && !sheet.acces?.boiteClePompier && !sheet.acces?.raccordPompierLieu && (
            <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>Aucune information d'accès déclarée.</p>
          )}
        </Section>

        <Section icon={<Flame size={14} color="#C0392B" />} title="Protection incendie">
          <Row label="Panneau d'alarme" value={sheet.protectionIncendie?.panneauLocalisation} />
          <Row label="Réseau de gicleurs" value={sheet.protectionIncendie?.gicleurs ? (sheet.protectionIncendie?.salleGicleurs || 'Présent') : 'Absent'} />
          <Row label="Pompe incendie" value={sheet.protectionIncendie?.pompeIncendie ? (sheet.protectionIncendie?.pompeIncendieLieu || 'Présente') : 'Absente'} />
        </Section>

        {sheet.matieresDangereuses?.presentes && (
          <Section icon={<ShieldAlert size={14} color="#E67E22" />} title="Matières dangereuses">
            {sheet.matieresDangereuses.ammoniac && <Row label="⚠️ Ammoniac" value="Présent sur le site" />}
            {sheet.matieresDangereuses.batteriesLithium && <Row label="⚠️ Batteries lithium" value="Présentes sur le site" />}
            {(sheet.matieresDangereuses.liste || []).map((m: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #F8F9FA' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#2C3E50' }}>{m.nom} {m.numeroUN ? `(UN ${m.numeroUN})` : ''}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6C757D' }}>{m.emplacementPrecis || m.quantiteEmplacement || '—'}</p>
              </div>
            ))}
            {(!sheet.matieresDangereuses.liste || sheet.matieresDangereuses.liste.length === 0) && (
              <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>Présence déclarée, sans détail disponible.</p>
            )}
          </Section>
        )}

        <Section icon={<Wrench size={14} color="#2C3E50" />} title="Coupures d'utilités">
          <Row label="Gaz naturel" value={sheet.utilites?.vanneGazNaturel} />
          <Row label="Eau domestique" value={sheet.utilites?.vanneEauDomestique} />
          <Row label="Salle électrique" value={sheet.utilites?.vanneSalleElectrique} />
          {!sheet.utilites?.vanneGazNaturel && !sheet.utilites?.vanneEauDomestique && !sheet.utilites?.vanneSalleElectrique && (
            <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>Aucune information déclarée.</p>
          )}
        </Section>

        {sheet.personnesAssistance?.present && (
          <Section icon={<Accessibility size={14} color="#8E44AD" />} title="Personnes nécessitant une assistance">
            <Row label="Types de limitations" value={(sheet.personnesAssistance.typesLimitations || []).join(', ') || '—'} />
            <Row label="Mesures prévues" value={(sheet.personnesAssistance.mesuresPrevues || []).join(', ') || '—'} />
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#E67E22', fontStyle: 'italic' }}>
              ⚠️ {sheet.personnesAssistance.avertissement}
            </p>
          </Section>
        )}

        <Section icon={<Users size={14} color="#2980B9" />} title={`Équipe d'urgence (${team.length})`}>
          {team.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: '#ADB5BD' }}>Aucun membre d'urgence présent au déclenchement.</p>
          ) : team.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8F9FA' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2C3E50' }}>{m.firstName} {m.lastName}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                {(m.roles || []).map((r: any) => (
                  <span key={r.role} style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', backgroundColor: '#FDEDEC', padding: '2px 6px', borderRadius: 4 }}>{r.role}</span>
                ))}
              </div>
            </div>
          ))}
        </Section>

        {sheet.building?.responsable?.name && (
          <Section icon={<Phone size={14} color="#2C3E50" />} title="Responsable du bâtiment">
            <Row label="Nom" value={sheet.building.responsable.name} />
            <Row label="Téléphone" value={sheet.building.responsable.phone} />
          </Section>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#ADB5BD', marginTop: 20 }}>
          Cette fiche est générée automatiquement par CORO à partir du plan de mesures d'urgence en vigueur.
          Elle reste accessible tant que l'incident est actif.
        </p>
      </div>
    </div>
  );
}
