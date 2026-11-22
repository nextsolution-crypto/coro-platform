/**
 * Montants et heures exacts (audit M6-03).
 *
 * Les heures et les montants sont arrondis au centième à l'enregistrement, et
 * toutes les sommes se font en entiers (centièmes) : plus aucune dérive
 * d'arrondi du type 0,1 + 0,2 = 0,30000000000000004 sur les totaux, les écarts
 * de budget ou les marges.
 */
export function toCents(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  // toPrecision corrige la représentation binaire (1,005 × 100 = 100,4999…).
  return Math.round(Number.parseFloat((n * 100).toPrecision(12)));
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Arrondi au centième (heures ou dollars) pour l'enregistrement. */
export function round2(value: unknown): number {
  return fromCents(toCents(value));
}

/** Arrondi au centième, ou null si la valeur est absente ou invalide. */
export function round2OrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? round2(n) : null;
}

/** Somme exacte au centième. */
export function sum2<T>(items: readonly T[], pick: (item: T) => unknown): number {
  let cents = 0;
  for (const item of items) cents += toCents(pick(item));
  return fromCents(cents);
}

/** Produit heures × taux, exact au centième. */
export function multiply2(hours: unknown, rate: unknown): number {
  return fromCents(Math.round((toCents(hours) * toCents(rate)) / 100));
}
