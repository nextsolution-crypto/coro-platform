import type { Locale } from '@/lib/site/locale'; import { productStatusLabel, type ProductStatus } from '@/lib/site/status'; import styles from './primitives.module.css';
export function StatusBadge({ status, locale }: { status: ProductStatus; locale: Locale }) { return <span className={`${styles.status} ${styles[status]}`}>{productStatusLabel(status, locale)}</span>; }
