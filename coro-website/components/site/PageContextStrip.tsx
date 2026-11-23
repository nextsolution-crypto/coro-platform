import type { Locale } from '@/lib/site/locale';
import { pageContextLabels, pageContexts } from '@/lib/site/page-context';
import styles from './PageContextStrip.module.css';

/** Bandeau « Moment · Pour qui » en haut des pages produit (rien si la page n'a pas de repère). */
export function PageContextStrip({ locale, pathname }: { locale: Locale; pathname: string }) {
  const context = pageContexts[pathname];
  if (!context) return null;
  const labels = pageContextLabels[locale];
  return (
    <aside className={styles.strip} aria-label={labels.region}>
      <dl className={styles.inner}>
        <div><dt>{labels.moment}</dt><dd>{context.moment[locale]}</dd></div>
        <div><dt>{labels.audience}</dt><dd>{context.audience[locale]}</dd></div>
      </dl>
    </aside>
  );
}
