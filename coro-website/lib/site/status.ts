import type { Locale } from './locale.ts';
export type ProductStatus = 'available' | 'in-development' | 'planned' | 'coming-soon';
const labels: Record<ProductStatus, Record<Locale, string>> = { available: { fr: 'Disponible', en: 'Available' }, 'in-development': { fr: 'En développement', en: 'In development' }, planned: { fr: 'En planification', en: 'Planned' }, 'coming-soon': { fr: 'À venir', en: 'Coming soon' } };
export function productStatusLabel(status: ProductStatus, locale: Locale): string { return labels[status][locale]; }
