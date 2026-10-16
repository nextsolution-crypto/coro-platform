'use client';

import type { ReactNode } from 'react';
import { Building2, Clock } from 'lucide-react';
import { GlassButton, GlassField, GlassTable, PageHeader } from '@/design-system/kit';

/**
 * Vue Liquid Glass de /profile/rendement (route bêta du registre).
 *
 * Reçoit de la page les données DÉJÀ chargées (heures, revenus, mandats), le mode de période et les actions (changer de
 * période, ouvrir un mandat). Elle ne charge rien, ne calcule aucune période et ne connaît ni l'API, ni l'utilisateur,
 * ni les routes : le métier reste entièrement dans la page. Aucune couleur en dur : tokens --cg-* et primitives du kit.
 *
 * Le formatage d'affichage (heures à une décimale, montants arrondis, tiret si zéro) reproduit à l'identique celui du Legacy.
 * États couverts : chargement, vide (aucune heure saisie, y compris après une erreur de chargement, comme en Legacy), données.
 */

export interface RendementMandat {
  projectId: string;
  clientName: string;
  projectName: string;
  heures: number;
  montantVendu: number;
  coutReel: number;
  marge: number;
  margePct: number | string;
}

export interface RendementData {
  heuresTotal: number;
  revenusTotal: number;
  mandatsCount: number;
  mandatsList: RendementMandat[];
}

export interface RendementGlassViewProps {
  loading: boolean;
  data: RendementData | null;
  /** Modes de période proposés (mêmes libellés que la page Legacy). */
  modes: Array<{ id: string; label: string }>;
  viewMode: string;
  onViewMode: (id: string) => void;
  customFrom: string;
  onCustomFrom: (value: string) => void;
  customTo: string;
  onCustomTo: (value: string) => void;
  onOpen: (projectId: string) => void;
}

const hours = (value: number) => `${value.toFixed(1)}h`;
const money = (value: number) => (value > 0 ? `${value.toFixed(0)} $` : '—');
const marginText = (m: RendementMandat) => (m.montantVendu > 0 ? `${m.marge.toFixed(0)} $ (${m.margePct}%)` : '—');
// Montant vendu à zéro : la marge n'est pas disponible (« — »). Teinte neutre en Glass : un tiret n'est ni un gain ni une perte.
// Le Legacy colore ce tiret selon le signe de la marge brute ; il n'est pas modifié.
const marginToken = (m: RendementMandat) => (m.montantVendu <= 0 ? 'var(--cg-text-secondary)' : m.marge >= 0 ? 'var(--cg-success-fg)' : 'var(--cg-danger-fg)');

function Icon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="inline-flex flex-shrink-0">{children}</span>;
}

export default function RendementGlassView(props: RendementGlassViewProps) {
  const { loading, data } = props;

  const header = <PageHeader eyebrow="Mon profil" title="Mon rendement" />;

  // Période : groupe de boutons natifs à bascule (aria-pressed), nommé par une légende masquée visuellement.
  const periods = (
    <fieldset className="mb-6" style={{ border: 0, padding: 0, minWidth: 0 }}>
      <legend className="sr-only">Période</legend>
      <div className="flex flex-wrap gap-2">
        {props.modes.map((m) => (
          <GlassButton
            key={m.id}
            variant={props.viewMode === m.id ? 'primary' : 'secondary'}
            aria-pressed={props.viewMode === m.id}
            onClick={() => props.onViewMode(m.id)}
            className="flex-1 sm:flex-none"
            style={{ minWidth: 110, minHeight: 44, whiteSpace: 'nowrap' }}
          >
            {m.label}
          </GlassButton>
        ))}
      </div>
    </fieldset>
  );

  const custom = props.viewMode === 'custom' && (
    <div className="cg-glass grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4">
      <GlassField label="Du">{(c) => <input {...c} type="date" value={props.customFrom} onChange={(e) => props.onCustomFrom(e.target.value)} />}</GlassField>
      <GlassField label="Au">{(c) => <input {...c} type="date" value={props.customTo} onChange={(e) => props.onCustomTo(e.target.value)} />}</GlassField>
    </div>
  );

  let body: ReactNode;
  if (loading) {
    body = (
      <div role="status" aria-live="polite" className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: 'var(--cg-text-muted)' }}>Chargement...</p>
      </div>
    );
  } else if (!data) {
    body = (
      <div className="cg-glass text-center py-12 sm:py-16 px-4">
        <span aria-hidden="true" className="inline-flex mb-4" style={{ color: 'var(--cg-text-muted)' }}><Clock size={40} strokeWidth={1.5} /></span>
        <p className="text-sm" style={{ color: 'var(--cg-text-secondary)' }}>Aucune heure saisie pour cette période</p>
      </div>
    );
  } else {
    const stats = [
      { label: 'Heures saisies', value: hours(data.heuresTotal), token: 'var(--cg-info-fg)' },
      { label: 'Revenus générés', value: data.revenusTotal > 0 ? `${data.revenusTotal.toFixed(0)} $` : '—', token: 'var(--cg-success-fg)' },
      { label: 'Mandats actifs', value: String(data.mandatsCount), token: 'var(--cg-accent-text)' },
    ];

    // Ouverture d'un mandat au clavier : vrai <button> natif (Entrée et Espace gérés par le navigateur). Le clic sur toute la
    // ligne ou la carte reste un confort à la souris, sans rôle ARIA ; stopPropagation évite une seconde ouverture par bulle.
    const openButton = (m: RendementMandat) => (
      <GlassButton
        variant="ghost"
        aria-label={`Ouvrir le mandat ${m.projectName} de ${m.clientName}`}
        title={m.projectName}
        style={{ display: 'flex', justifyContent: 'flex-start', minHeight: 44, padding: '0 8px', margin: '0 -8px', maxWidth: '100%', textAlign: 'left' }}
        onClick={(e) => { e.stopPropagation(); props.onOpen(m.projectId); }}
      >
        <span className="break-words" style={{ minWidth: 0 }}>{m.projectName}</span>
      </GlassButton>
    );

    body = (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          {stats.map((s) => (
            <div key={s.label} className="cg-glass p-4 sm:p-5">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--cg-text-secondary)' }}>{s.label}</p>
              <p className="text-2xl font-black" style={{ color: s.token }}>{s.value}</p>
            </div>
          ))}
        </div>

        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--cg-text-primary)' }}>Détail par mandat</h2>

        {/* MOBILE — cartes */}
        <ul role="list" className="md:hidden space-y-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {data.mandatsList.map((m) => (
            <li key={m.projectId}>
              <div onClick={() => props.onOpen(m.projectId)} className="cg-glass cg-lift p-4 cursor-pointer">
                <div className="mb-3">
                  <p className="text-xs mb-1 inline-flex items-center gap-1.5" style={{ color: 'var(--cg-text-secondary)' }}>
                    <Icon><Building2 size={13} /></Icon>{m.clientName}
                  </p>
                  <div className="text-sm font-semibold" style={{ color: 'var(--cg-text-primary)' }}>{openButton(m)}</div>
                </div>
                <dl className="grid grid-cols-2 gap-3 text-xs" style={{ margin: 0 }}>
                  <div>
                    <dt className="uppercase tracking-wide mb-1" style={{ color: 'var(--cg-text-muted)' }}>Heures</dt>
                    <dd className="font-bold" style={{ color: 'var(--cg-info-fg)', margin: 0 }}>{hours(m.heures)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide mb-1" style={{ color: 'var(--cg-text-muted)' }}>Montant vendu</dt>
                    <dd style={{ color: 'var(--cg-text-primary)', margin: 0 }}>{money(m.montantVendu)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide mb-1" style={{ color: 'var(--cg-text-muted)' }}>Coût réel</dt>
                    <dd style={{ color: 'var(--cg-text-primary)', margin: 0 }}>{money(m.coutReel)}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide mb-1" style={{ color: 'var(--cg-text-muted)' }}>Marge</dt>
                    <dd className="font-bold" style={{ color: marginToken(m), margin: 0 }}>{marginText(m)}</dd>
                  </div>
                </dl>
                <p aria-hidden="true" className="mt-3 pt-3 text-right text-xs font-medium" style={{ color: 'var(--cg-accent-text)', borderTop: '1px solid var(--cg-border-subtle, var(--cg-border-default))' }}>
                  Voir le mandat →
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* TABLETTE + DESKTOP — tableau */}
        <div className="hidden md:block">
          <GlassTable label="Détail par mandat" interactive minWidth={820} focusable={false}>
            <thead>
              <tr>{['Client', 'Mandat', 'Heures', 'Montant vendu', 'Coût réel', 'Marge'].map((col) => <th key={col} scope="col">{col}</th>)}</tr>
            </thead>
            <tbody>
              {data.mandatsList.map((m) => (
                <tr key={m.projectId} style={{ cursor: 'pointer' }} onClick={() => props.onOpen(m.projectId)}>
                  <td className="whitespace-nowrap" style={{ color: 'var(--cg-text-secondary)' }}>{m.clientName}</td>
                  <td style={{ fontWeight: 500 }}>{openButton(m)}</td>
                  <td className="whitespace-nowrap" style={{ fontWeight: 700, color: 'var(--cg-info-fg)' }}>{hours(m.heures)}</td>
                  <td className="whitespace-nowrap">{money(m.montantVendu)}</td>
                  <td className="whitespace-nowrap">{money(m.coutReel)}</td>
                  <td className="whitespace-nowrap" style={{ fontWeight: 700, color: marginToken(m) }}>{marginText(m)}</td>
                </tr>
              ))}
            </tbody>
          </GlassTable>
        </div>
      </>
    );
  }

  return (
    <div>
      {header}
      {periods}
      {custom}
      {body}
    </div>
  );
}
