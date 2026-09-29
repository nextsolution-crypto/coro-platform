import type { ReactNode } from 'react';
import type { Locale } from '@/lib/site/locale';
import { SiteFooterV2 } from '@/components/conversion/SiteFooterV2';
import { SiteHeader, type SiteHeaderTone } from './SiteHeader';
import { SkipLink } from './SkipLink';
import styles from './V2Shell.module.css';

/**
 * Page shell for a route MIGRATED to Design System V1.0 (see lib/site/v2-migration.ts).
 * It owns: the V1 token scope, the local language, the skip link, the header, the single main landmark and the V2 footer.
 * The V1 scope lives here, never on html/body, so legacy pages stay outside it.
 * `lang` covers the migrated content only; the document-level <html lang> is a separate, open migration item.
 * Pages pass CONTENT as children and must not render their own <main>.
 */
export function V2Shell({ locale, pathname = '/', headerTone = 'light', englishAvailable = true, children }: { locale: Locale; pathname?: string; headerTone?: SiteHeaderTone; englishAvailable?: boolean; children: ReactNode }) {
  return (
    <div className={styles.shell} data-coro-system="v1" lang={locale}>
      <SkipLink locale={locale} />
      <SiteHeader locale={locale} pathname={pathname} tone={headerTone} englishAvailable={englishAvailable} />
      <main id="main-content" tabIndex={-1} className={styles.main}>{children}</main>
      <SiteFooterV2 locale={locale} pathname={pathname} englishAvailable={englishAvailable} />
    </div>
  );
}
