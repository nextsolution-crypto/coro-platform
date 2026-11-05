'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Gauge,
  ShieldAlert,
  Wind,
} from 'lucide-react';

type CriticalZone = {
  id: string;
  code: string;
  nameFR: string;
  maxDistanceKm: number | null;
  purpose?: string;
  protectiveAction: string | null;
  approvedForAlerting?: boolean;
};

export type DispersionCriticalScenario = {
  nameFR: string;
  releaseDescription: string | null;
  potentialEffects: string | null;
  defaultProtectiveAction: string | null;
  publicInstructionFR: string | null;
  liveReady?: boolean;
  substance?: {
    nameFR: string;
    casNumber: string;
    unNumbers: string[];
    hazardCategory: string;
    maximumQuantityTonnes: number | null;
    regulatoryThresholdTonnes: number;
  } | null;
  dispersionBasis?: {
    modelName: string | null;
    modelVersion: string | null;
    studyTitle: string | null;
    studyReference: string | null;
    studyDate: string | null;
    endpointName: string | null;
    endpointConcentrationPpm: number | null;
    endpointAveragingTimeSeconds: number | null;
    windSpeedMetersPerSecond: number | null;
    atmosphericStabilityClass: string | null;
    releaseDurationSeconds: number | null;
    receptorHeightMeters: number | null;
    assumptions: string | null;
    limitations: string | null;
    reviewedAt: string | null;
    complete: boolean;
    missingFields: string[];
    sourceDocument: {
      id: string;
      name: string;
      version: number;
      downloadable: boolean;
    } | null;
  } | null;
  impactZones: CriticalZone[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return 'À confirmer';
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds} s`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'À confirmer';
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function actionLabel(value: string | null) {
  const labels: Record<string, string> = {
    SHELTER_IN_PLACE: 'Mise à l’abri',
    EVACUATE: 'Évacuation',
    AVOID_AREA: 'Éviter le secteur',
    MONITOR: 'Surveillance',
    OTHER: 'Mesure à confirmer',
  };
  return value ? labels[value] || value.replaceAll('_', ' ') : 'À confirmer';
}

export default function DispersionCriticalSummary({
  scenario,
}: {
  scenario: DispersionCriticalScenario;
}) {
  const [sourceStatus, setSourceStatus] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const basis = scenario.dispersionBasis;
  const distances = scenario.impactZones
    .map((zone) => zone.maxDistanceKm)
    .filter((value): value is number => typeof value === 'number')
    .sort((left, right) => right - left);
  const maximumDistance = distances[0] ?? null;

  const openSource = async () => {
    if (!basis?.sourceDocument?.downloadable || sourceLoading) return;
    setSourceLoading(true);
    setSourceStatus(null);
    try {
      const token = localStorage.getItem('coro_client_token');
      const response = await fetch(
        `${API_URL}/project-files/client/file/${basis.sourceDocument.id}/content`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error('SOURCE_UNAVAILABLE');
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      setSourceStatus('Rapport ouvert dans un nouvel onglet.');
    } catch {
      setSourceStatus(
        'Le rapport source n’a pas pu être ouvert. Vérifiez vos droits documentaires.',
      );
    } finally {
      setSourceLoading(false);
    }
  };

  return (
    <section
      aria-labelledby="dispersion-critical-title"
      style={{
        marginBottom: 18,
        overflow: 'hidden',
        border: '1px solid #365067',
        borderRadius: 14,
        background: 'linear-gradient(145deg, #102333 0%, #142D3E 100%)',
        color: '#F8FAFC',
        boxShadow: '0 16px 36px rgba(3, 15, 26, 0.18)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
          padding: '18px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <div style={{ maxWidth: 760, minWidth: 0, flex: '1 1 300px' }}>
          <p
            style={{
              margin: '0 0 5px',
              color: '#4DE1B5',
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Synthèse critique du rapport de dispersion
          </p>
          <h2 id="dispersion-critical-title" style={{ margin: 0, fontSize: 18 }}>
            {basis?.studyTitle || scenario.nameFR}
          </h2>
          <p style={{ margin: '7px 0 0', color: '#B9C8D4', lineHeight: 1.55 }}>
            Accès rapide aux hypothèses et seuils qui encadrent la décision.
            Cette fiche ne remplace ni le rapport d’ingénierie ni la validation
            humaine du périmètre d’alerte.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            maxWidth: '100%',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
              padding: '7px 10px',
              borderRadius: 999,
              background: basis?.reviewedAt ? '#0D6B59' : '#6B4B12',
              fontSize: 10,
              fontWeight: 900,
            }}
          >
            {basis?.reviewedAt ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {basis?.reviewedAt ? 'Révisée' : 'Révision requise'}
          </span>
          <span
            style={{
              padding: '7px 10px',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 900,
            }}
          >
            {scenario.liveReady ? 'Admissible LIVE' : 'Non admissible LIVE'}
          </span>
        </div>
      </div>

      {basis && !basis.complete ? (
        <div
          role="status"
          style={{
            margin: '14px 20px 0',
            padding: '11px 13px',
            border: '1px solid rgba(255, 188, 77, 0.55)',
            borderRadius: 10,
            background: 'rgba(107, 75, 18, 0.35)',
            color: '#FFE1A8',
            lineHeight: 1.45,
          }}
        >
          <strong>Fiche scientifique incomplète.</strong>{' '}
          {basis.missingFields.length} élément
          {basis.missingFields.length > 1 ? 's sont' : ' est'} encore à confirmer avant
          une diffusion réelle.
        </div>
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
          gap: 10,
          padding: '16px 20px',
        }}
      >
        {[
          {
            icon: <ShieldAlert size={17} />,
            label: 'Substance et danger',
            value: scenario.substance
              ? `${scenario.substance.nameFR} · CAS ${scenario.substance.casNumber}`
              : 'À confirmer',
            detail: scenario.substance?.maximumQuantityTonnes
              ? `${scenario.substance.maximumQuantityTonnes.toLocaleString('fr-CA')} t max. sur le site`
              : scenario.substance?.hazardCategory || 'Quantité à confirmer',
          },
          {
            icon: <Gauge size={17} />,
            label: 'Seuil de planification',
            value:
              basis?.endpointName && basis.endpointConcentrationPpm
                ? `${basis.endpointName} · ${basis.endpointConcentrationPpm.toLocaleString('fr-CA')} ppm`
                : 'À confirmer',
            detail: `Moyenne ${formatDuration(basis?.endpointAveragingTimeSeconds)}`,
          },
          {
            icon: <Wind size={17} />,
            label: 'Météo de référence',
            value:
              basis?.windSpeedMetersPerSecond != null
                ? `${basis.windSpeedMetersPerSecond.toLocaleString('fr-CA')} m/s · stabilité ${basis.atmosphericStabilityClass || 'à confirmer'}`
                : 'À confirmer',
            detail: 'Condition modélisée, pas la météo en temps réel',
          },
          {
            icon: <AlertTriangle size={17} />,
            label: 'Portée maximale',
            value:
              maximumDistance != null
                ? `${maximumDistance.toLocaleString('fr-CA')} km`
                : 'À confirmer',
            detail: `${formatDuration(basis?.releaseDurationSeconds)} de rejet · récepteur ${basis?.receptorHeightMeters ?? '—'} m`,
          },
        ].map((item) => (
          <article
            key={item.label}
            style={{
              padding: 13,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.045)',
            }}
          >
            <div style={{ display: 'flex', gap: 7, color: '#4DE1B5' }}>
              {item.icon}
              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase' }}>
                {item.label}
              </span>
            </div>
            <strong style={{ display: 'block', marginTop: 9, fontSize: 13 }}>
              {item.value}
            </strong>
            <span style={{ display: 'block', marginTop: 5, color: '#AABBC8', fontSize: 10 }}>
              {item.detail}
            </span>
          </article>
        ))}
      </div>

      <div style={{ padding: '0 20px 18px' }}>
        <div style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}>
          <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: 10 }}>
            <thead>
              <tr style={{ color: '#AFC0CC', textAlign: 'left' }}>
                {['Zone', 'Distance', 'Mesure', 'Usage', 'Alerte publique'].map((heading) => (
                  <th key={heading} style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenario.impactZones.map((zone) => (
                <tr key={zone.id}>
                  <td style={{ padding: '10px 12px' }}><strong>{zone.code}</strong> · {zone.nameFR}</td>
                  <td style={{ padding: '10px 12px' }}>{zone.maxDistanceKm != null ? `${zone.maxDistanceKm.toLocaleString('fr-CA')} km` : '—'}</td>
                  <td style={{ padding: '10px 12px' }}>{actionLabel(zone.protectiveAction)}</td>
                  <td style={{ padding: '10px 12px' }}>{zone.purpose?.replaceAll('_', ' ') || 'À qualifier'}</td>
                  <td style={{ padding: '10px 12px', color: zone.approvedForAlerting ? '#4DE1B5' : '#F6C76A' }}>
                    {zone.approvedForAlerting ? 'Approuvée' : 'Non approuvée'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {(scenario.releaseDescription || scenario.potentialEffects || scenario.publicInstructionFR) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: 10, marginTop: 12 }}>
            {scenario.releaseDescription && <InfoBlock title="Scénario de rejet" text={scenario.releaseDescription} />}
            {scenario.potentialEffects && <InfoBlock title="Effets potentiels" text={scenario.potentialEffects} />}
            {scenario.publicInstructionFR && <InfoBlock title="Consigne préparée" text={scenario.publicInstructionFR} />}
          </div>
        )}

        <details style={{ marginTop: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 900 }}>Hypothèses, limites et traçabilité</summary>
          <div style={{ display: 'grid', gap: 10, marginTop: 12, color: '#C5D1DA', lineHeight: 1.55, fontSize: 10 }}>
            <p style={{ margin: 0 }}><strong>Hypothèses :</strong> {basis?.assumptions || 'À documenter.'}</p>
            <p style={{ margin: 0 }}><strong>Limites :</strong> {basis?.limitations || 'À documenter.'}</p>
            <p style={{ margin: 0 }}><strong>Modèle :</strong> {basis?.modelName || '—'} {basis?.modelVersion ? `v${basis.modelVersion}` : ''} · <strong>Référence :</strong> {basis?.studyReference || '—'} · <strong>Date :</strong> {formatDate(basis?.studyDate)}</p>
            <p style={{ margin: 0 }}><strong>Dernière révision :</strong> {formatDate(basis?.reviewedAt)}</p>
          </div>
        </details>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 13 }}>
          {basis?.sourceDocument ? (
            <button
              type="button"
              disabled={!basis.sourceDocument.downloadable || sourceLoading}
              onClick={openSource}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                minHeight: 44,
                padding: '0 13px',
                border: 0,
                borderRadius: 8,
                background: basis.sourceDocument.downloadable ? '#00A982' : '#506170',
                color: '#FFFFFF',
                cursor: basis.sourceDocument.downloadable ? 'pointer' : 'not-allowed',
                fontWeight: 900,
              }}
            >
              <FileText size={16} />
              {sourceLoading ? 'Ouverture…' : `Ouvrir le rapport · v${basis.sourceDocument.version}`}
              <ExternalLink size={14} />
            </button>
          ) : (
            <span style={{ color: '#F6C76A', fontSize: 10 }}>
              Aucun document canonique n’est encore rattaché à cette fiche.
            </span>
          )}
          {basis?.sourceDocument && <span style={{ color: '#AABBC8', fontSize: 10 }}>{basis.sourceDocument.name}</span>}
          <span aria-live="polite" style={{ color: '#C5D1DA', fontSize: 10 }}>{sourceStatus}</span>
        </div>
      </div>
    </section>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ padding: 12, borderLeft: '3px solid #00A982', background: 'rgba(255,255,255,0.035)' }}>
      <strong style={{ display: 'block', marginBottom: 5, fontSize: 10 }}>{title}</strong>
      <p style={{ margin: 0, color: '#B9C8D4', fontSize: 10, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}
