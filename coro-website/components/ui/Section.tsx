import type { ReactNode } from 'react'; import styles from './primitives.module.css';
export function Section({ children, tone = 'default', className = '' }: { children: ReactNode; tone?: 'default' | 'soft' | 'dark'; className?: string }) { return <section className={`${styles.section} ${styles[tone]} ${className}`}>{children}</section>; }
