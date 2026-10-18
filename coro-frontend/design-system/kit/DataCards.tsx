import type { ReactNode } from 'react';
import './kit.css';

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Colonne principale : devient le titre de la carte sur mobile. Une seule recommandée. */
  primary?: boolean;
}

export interface ResponsiveDataCardsProps<T> {
  /** Nom accessible (tableau et liste). */
  label: string;
  columns: DataColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: ReactNode;
}

/**
 * Données en TABLEAU sur grand écran et en CARTES sur mobile (≤ 720 px) : même contenu, jamais de défilement horizontal imposé au téléphone.
 * Les deux rendus sont dans le DOM ; le CSS masque l'inutile (display: none retire aussi l'élément de l'arbre d'accessibilité).
 */
export function ResponsiveDataCards<T>({ label, columns, rows, getRowKey, emptyMessage }: ResponsiveDataCardsProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="cgx-table-wrap" role="region" aria-label={label}>
        <p className="cgx-table-empty">{emptyMessage ?? 'Aucune donnée à afficher.'}</p>
      </div>
    );
  }
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const others = columns.filter((c) => c !== primary);
  return (
    <div className="cgx-datacards">
      <div className="cgx-datacards__table cgx-table-wrap" role="region" aria-label={label}>
        <table className="cgx-table">
          <thead><tr>{columns.map((c) => <th key={c.key} scope="col">{c.header}</th>)}</tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={getRowKey(row)}>{columns.map((c) => <td key={c.key}>{c.render(row)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="cgx-datacards__list" aria-label={label}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className="cgx-datacard">
            <div className="cgx-datacard__title">{primary.render(row)}</div>
            <dl className="cgx-datacard__fields">
              {others.map((c) => (
                <div key={c.key} className="cgx-datacard__field">
                  <dt>{c.header}</dt>
                  <dd>{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
