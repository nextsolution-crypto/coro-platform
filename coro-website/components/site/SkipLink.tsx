import type { Locale } from '@/lib/site/locale';
import styles from './SkipLink.module.css';

/**
 * Keyboard skip link: the first focusable element of a page, visible only while focused.
 * Promoted from the Design Lab (LAB-08). Rendered by V2Shell for migrated routes; it is never installed for legacy pages.
 */
export function SkipLink({ locale, targetId = 'main-content' }: { locale: Locale; targetId?: string }) {
  return <a className={styles.skipLink} href={`#${targetId}`}>{locale === 'fr' ? 'Aller au contenu principal' : 'Skip to main content'}</a>;
}
