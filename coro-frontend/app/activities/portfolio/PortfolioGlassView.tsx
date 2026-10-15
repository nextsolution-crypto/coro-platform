'use client';

import type { ReactNode } from 'react';
import { Building2, CalendarDays, CalendarX, Clock, Download, MapPin, Search, Video } from 'lucide-react';
import { GlassButton, GlassTable, PageHeader, StatusBadge } from '@/design-system/kit';
import type { StatusTone } from '@/design-system/kit';

/**
 * Vue Liquid Glass de /activities/portfolio (route bêta du registre).
 *
 * Reçoit de la page les données DÉJÀ chargées, filtrées et comptées, ainsi que les actions (ouvrir un projet, télécharger
 * le .ics). Elle ne charge rien, ne filtre rien, ne connaît ni l'API, ni les rôles, ni les routes : le métier reste
 * entièrement dans la page. Aucune couleur en dur : tokens --cg-* et primitives du kit uniquement.
 *
 * États couverts : chargement, vide (aucun résultat), données. Il n'existe pas d'état d'erreur dédié en Legacy (une erreur
 * de chargement donne la liste vide) : la vue Glass reproduit ce comportement et n'en invente pas.
 */

export interface PortfolioRow {
  id: string;
  projectId: string;
  clientName: string;
  buildingName: string;
  /** Libellé affiché (libellé personnalisé s'il existe, sinon libellé standard) : résolu par la page. */
  label: string;
  duration?: string;
  mode?: string;
  scheduledDate?: string | null;
  status: string;
}

export interface PortfolioStats {
  total: number;
  done: number;
  aFaire: number;
  reporte: number;
  pct: number;
}

export interface PortfolioGlassViewProps {
  loading: boolean;
  stats: PortfolioStats;
  rows: PortfolioRow[];
  search: string;
  onSearch: (value: string) => void;
  clients: Array<{ id: string; name: string }>;
  filterClient: string;
  onFilterClient: (value: string) => void;
  statusOptions: Array<{ value: string; label: string }>;
  filterStatus: string;
  onFilterStatus: (value: string) => void;
  types: string[];
  filterType: string;
  onFilterType: (value: string) => void;
  /** Libellé de chaque statut (même table que la page Legacy). */
  statusLabels: Record<string, string>;
  /** Formatage de date identique à la page Legacy (jour, mois abrégé, année). */
  formatDate: (value: string) => string;
  onOpen: (projectId: string) => void;
  onDownloadIcs: (activityId: string, label: string) => void;
}

// Teinte sémantique par statut (remplace les couleurs hexadécimales du Legacy). Statut inconnu : « À faire », comme en Legacy.
const STATUS_TONE: Record<string, StatusTone> = {
  a_faire: 'info',
  fait: 'success',
  reporte: 'warning',
  annule: 'neutral',
  termine: 'success',
};

function Icon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true" className="inline-flex flex-shrink-0">{children}</span>;
}

const stat = (label: string, value: number, token: string) => ({ label, value, token });

export default function PortfolioGlassView(props: PortfolioGlassViewProps) {
  const { loading, stats, rows } = props;

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center py-24">
        <p className="text-sm animate-pulse" style={{ color: 'var(--cg-text-muted)' }}>Chargement du portefeuille...</p>
      </div>
    );
  }

  const statusOf = (row: PortfolioRow) => {
    const known = row.status in STATUS_TONE;
    return { tone: known ? STATUS_TONE[row.status] : STATUS_TONE.a_faire, label: props.statusLabels[known ? row.status : 'a_faire'] };
  };
  const modeBadge = (row: PortfolioRow) => (row.mode === 'teams'
    ? <StatusBadge tone="info"><Icon><Video size={12} /></Icon>Teams</StatusBadge>
    : <StatusBadge tone="success"><Icon><MapPin size={12} /></Icon>Présentiel</StatusBadge>);
  const download = (row: PortfolioRow) => (
    <GlassButton
      variant="secondary"
      title="Télécharger .ics"
      aria-label={`Télécharger ${row.label} au format calendrier`}
      style={{ padding: 0, minWidth: 44, minHeight: 44, color: 'var(--cg-info-fg)' }}
      onClick={(e) => { e.stopPropagation(); props.onDownloadIcs(row.id, row.label); }}
    >
      <Download size={14} aria-hidden="true" />
    </GlassButton>
  );

  // Ouverture du projet au clavier : vrai <button> natif (Entrée et Espace gérés par le navigateur). Le clic sur toute la
  // ligne ou la carte reste un confort à la souris, sans rôle ARIA ; stopPropagation évite une seconde ouverture par bulle.
  const openButton = (row: PortfolioRow, truncate: boolean) => (
    <GlassButton
      variant="ghost"
      aria-label={`Ouvrir le projet de ${row.clientName} : ${row.label}`}
      title={row.label}
      style={{ display: 'flex', justifyContent: 'flex-start', minHeight: 44, padding: '0 8px', margin: '0 -8px', maxWidth: '100%', textAlign: 'left' }}
      onClick={(e) => { e.stopPropagation(); props.onOpen(row.projectId); }}
    >
      <span className={truncate ? 'block truncate' : 'break-words'} style={{ minWidth: 0 }}>{row.label}</span>
    </GlassButton>
  );

  const stats4 = [
    stat('Total activités', stats.total, 'var(--cg-text-primary)'),
    stat('Terminées', stats.done, 'var(--cg-success-fg)'),
    stat('À faire', stats.aFaire, 'var(--cg-info-fg)'),
    stat('Reportées', stats.reporte, 'var(--cg-warning-fg)'),
  ];
  const progressFill = stats.pct === 100 ? 'var(--cg-success-fg)' : stats.pct > 50 ? 'var(--cg-notice-bg)' : 'var(--cg-accent)';

  return (
    <div>
      <PageHeader eyebrow="Vue globale" title="Portefeuille des activités" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {stats4.map((s) => (
          <div key={s.label} className="cg-glass p-4">
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--cg-text-secondary)' }}>{s.label}</p>
            <p className="text-2xl font-black" style={{ color: s.token }}>{s.value}</p>
          </div>
        ))}
      </div>

      {stats.total > 0 && (
        <div className="cg-glass p-4 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--cg-text-secondary)' }}>Progression globale</span>
            <span className="text-xs font-bold" style={{ color: 'var(--cg-text-primary)' }}>{stats.pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progression globale"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.pct}
            className="w-full h-2 rounded-full"
            style={{ backgroundColor: 'var(--cg-active-overlay)' }}
          >
            <div className="h-2 rounded-full transition-all" style={{ width: `${stats.pct}%`, backgroundColor: progressFill }} />
          </div>
        </div>
      )}

      {/* Filtres : mêmes quatre contrôles, mêmes options. Les étiquettes visibles n'existent pas en Legacy : noms accessibles seulement. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="relative">
          <span aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--cg-text-muted)' }}>
            <Search size={15} />
          </span>
          <input
            type="text"
            value={props.search}
            onChange={(e) => props.onSearch(e.target.value)}
            placeholder="Rechercher..."
            aria-label="Rechercher une activité"
            className="cgx-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <select value={props.filterClient} onChange={(e) => props.onFilterClient(e.target.value)} aria-label="Filtrer par client" className="cgx-input">
          <option value="">Tous les clients</option>
          {props.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={props.filterStatus} onChange={(e) => props.onFilterStatus(e.target.value)} aria-label="Filtrer par statut" className="cgx-input">
          <option value="">Tous les statuts</option>
          {props.statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={props.filterType} onChange={(e) => props.onFilterType(e.target.value)} aria-label="Filtrer par type" className="cgx-input">
          <option value="">Tous les types</option>
          {props.types.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <div className="cg-glass text-center py-16 px-4">
          <span aria-hidden="true" className="inline-flex mb-4" style={{ color: 'var(--cg-text-muted)' }}><CalendarX size={40} strokeWidth={1.5} /></span>
          <p className="text-sm" style={{ color: 'var(--cg-text-secondary)' }}>Aucune activité trouvée</p>
        </div>
      ) : (
        <>
          {/* MOBILE — cartes */}
          <ul role="list" className="md:hidden space-y-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {rows.map((row) => {
              const st = statusOf(row);
              return (
                <li key={row.id}>
                  <div onClick={() => props.onOpen(row.projectId)} className="cg-glass cg-lift p-4 cursor-pointer">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        {openButton(row, false)}
                        <p className="text-xs mt-1 break-words" style={{ color: 'var(--cg-text-secondary)' }}>{row.clientName}</p>
                      </div>
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs break-words flex items-center gap-1.5" style={{ color: 'var(--cg-text-secondary)' }}>
                        <Icon><Building2 size={13} /></Icon>{row.buildingName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {modeBadge(row)}
                        {row.duration && (
                          <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--cg-text-muted)' }}>
                            <Icon><Clock size={12} /></Icon>{row.duration}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <span className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--cg-text-secondary)' }}>
                          <Icon><CalendarDays size={13} /></Icon>
                          {row.scheduledDate ? props.formatDate(row.scheduledDate) : 'Date à définir'}
                        </span>
                        {row.scheduledDate && download(row)}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* TABLETTE + DESKTOP — tableau */}
          <div className="hidden md:block">
            <GlassTable label="Activités" interactive minWidth={900} focusable={false}>
              <thead>
                <tr>
                  {['Client', 'Bâtiment', 'Activité', 'Mode', 'Date prévue', 'Statut'].map((col) => <th key={col} scope="col">{col}</th>)}
                  <th scope="col"><span className="sr-only">Télécharger .ics</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const st = statusOf(row);
                  return (
                    <tr key={row.id} style={{ cursor: 'pointer' }} onClick={() => props.onOpen(row.projectId)}>
                      <td style={{ fontWeight: 600 }}>{row.clientName}</td>
                      <td style={{ color: 'var(--cg-text-secondary)' }}>{row.buildingName}</td>
                      <td style={{ color: 'var(--cg-text-secondary)', maxWidth: 240 }}>
                        {openButton(row, true)}
                        {row.duration && (
                          <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--cg-text-muted)' }}>
                            <Icon><Clock size={12} /></Icon>{row.duration}
                          </span>
                        )}
                      </td>
                      <td>{modeBadge(row)}</td>
                      <td className="text-xs whitespace-nowrap" style={{ color: 'var(--cg-text-secondary)' }}>
                        {row.scheduledDate ? props.formatDate(row.scheduledDate) : <span style={{ color: 'var(--cg-text-muted)' }}>—</span>}
                      </td>
                      <td><StatusBadge tone={st.tone}>{st.label}</StatusBadge></td>
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>{row.scheduledDate ? download(row) : null}</td>
                    </tr>
                  );
                })}
              </tbody>
            </GlassTable>
          </div>
        </>
      )}
    </div>
  );
}
