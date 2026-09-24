import type { Locale } from '@/lib/site/locale';
import styles from './design-lab.module.css';

/**
 * Keyboard skip link. First focusable element of the page; visible only while focused.
 * Demonstrated in the Design Lab first — it is NOT installed in the root layout yet.
 */
export function SkipLink({ locale, targetId = 'lab-main' }: { locale: Locale; targetId?: string }) {
  return <a className={styles.skipLink} href={`#${targetId}`}>{locale === 'fr' ? 'Aller au contenu principal' : 'Skip to main content'}</a>;
}
