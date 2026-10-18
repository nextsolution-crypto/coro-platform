'use client';

import { useId } from 'react';
import './kit.css';

export interface PeriodValue {
  /** Dates ISO jour (AAAA-MM-JJ), sans heure ni fuseau : la conversion en instants appartient à l'écran et à l'API. */
  from: string;
  to: string;
}

export interface PeriodPreset {
  id: string;
  label: string;
  /** Calcule la période du préréglage (l'écran fournit la date de référence : le composant ne lit jamais l'horloge). */
  range: () => PeriodValue;
}

export interface PeriodSelectorProps {
  legend: string;
  value: PeriodValue;
  onChange: (value: PeriodValue) => void;
  presets?: PeriodPreset[];
  fromLabel?: string;
  toLabel?: string;
  /** Message affiché quand « du » est postérieur à « au » (la valeur invalide n'est PAS propagée). */
  invalidMessage?: string;
}

/** Sélecteur de période : deux champs date et préréglages optionnels. Une période inversée est signalée et jamais transmise. */
export function PeriodSelector({ legend, value, onChange, presets = [], fromLabel = 'Du', toLabel = 'Au', invalidMessage = 'La date de début doit précéder la date de fin.' }: PeriodSelectorProps) {
  const id = useId();
  const invalid = Boolean(value.from && value.to && value.from > value.to);
  const set = (next: PeriodValue) => {
    if (next.from && next.to && next.from > next.to) return; // jamais de période inversée vers l'écran
    onChange(next);
  };
  return (
    <fieldset className="cgx-period">
      <legend className="cgx-period__legend">{legend}</legend>
      <div className="cgx-period__fields">
        <label className="cgx-field" htmlFor={`${id}-from`}>
          <span className="cgx-field__label">{fromLabel}</span>
          <input id={`${id}-from`} className="cgx-input" type="date" value={value.from} max={value.to || undefined} aria-invalid={invalid || undefined}
            onChange={(e) => set({ from: e.target.value, to: value.to })} />
        </label>
        <label className="cgx-field" htmlFor={`${id}-to`}>
          <span className="cgx-field__label">{toLabel}</span>
          <input id={`${id}-to`} className="cgx-input" type="date" value={value.to} min={value.from || undefined} aria-invalid={invalid || undefined}
            onChange={(e) => set({ from: value.from, to: e.target.value })} />
        </label>
      </div>
      {presets.length > 0 ? (
        <div className="cgx-period__presets" role="group" aria-label="Périodes prédéfinies">
          {presets.map((p) => {
            const r = p.range();
            const active = r.from === value.from && r.to === value.to;
            return (
              <button key={p.id} type="button" className="cgx-button" data-variant="ghost" aria-pressed={active} onClick={() => onChange(r)}>{p.label}</button>
            );
          })}
        </div>
      ) : null}
      {invalid ? <p className="cgx-field__error" role="alert">{invalidMessage}</p> : null}
    </fieldset>
  );
}
