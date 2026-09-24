import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { localizedHref, switchLocaleHref, type Locale } from '@/lib/site/locale';
import { access, business, footerCopy, footerGroups } from './footer-content';
import styles from './conversion.module.css';

/**
 * Candidate V2 footer: the architectural foundation of a page. Hierarchy, not six equal columns:
 * brand and statement → navigation → access (the two known logins) → legal and business baseline.
 * Designed to replace BOTH production footers (app/components/Footer.tsx, components/site/SiteFooter.tsx); it replaces neither yet.
 * Only implemented routes are linked; a route missing in a language is left out of that language.
 */
export function SiteFooterV2({ locale, pathname = '/' }: { locale: Locale; pathname?: string }) {
  const t = footerCopy[locale];
  return (
    <footer className={styles.footer} data-surface="dark" lang={locale}>
      <Container>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link className={styles.footerLogo} href={localizedHref('/', locale)} aria-label="CORO">CO<span>RO</span></Link>
            <p className={styles.footerTagline}>{t.tagline}</p>
          </div>
          <nav className={styles.footerNav} aria-label={t.nav}>
            {footerGroups.filter((group) => group.id !== 'legal').map((group) => {
              const links = group.links.filter((link) => link[locale]);
              return (
                <div key={group.id} className={styles.footerGroup}>
                  <h2 className={styles.footerHeading}>{group.label[locale]}</h2>
                  <ul>{links.map((link) => <li key={link.path}><Link href={localizedHref(link.path, locale)}>{link.label[locale]}</Link></li>)}</ul>
                </div>
              );
            })}
          </nav>
        </div>

        <div className={styles.footerAccess}>
          <p className={styles.footerHeading}>{t.access}</p>
          <ul>
            <li><a href={access.platform}><b>{t.platform[0]}</b><span>{t.platform[1]}</span><span className={styles.srOnly}> {t.external}</span><span aria-hidden="true">↗</span></a></li>
            <li><a href={access.client}><b>{t.client[0]}</b><span>{t.client[1]}</span><span className={styles.srOnly}> {t.external}</span><span aria-hidden="true">↗</span></a></li>
          </ul>
        </div>

        <div className={styles.footerBase}>
          <address className={styles.footerContact} aria-label={t.contact}>
            <p className={styles.footerHeading}>{t.contact}</p>
            <p className={styles.footerPostal}><span>{business.address[0]}</span><span>{business.address[1]} · {business.address[2]}</span></p>
            <p className={styles.footerReach}><a href={`mailto:${business.email}`}>{business.email}</a><a href={business.phoneHref}>{business.phone}</a></p>
          </address>
          <div className={styles.footerLegalGroup}>
            <p className={styles.footerHeading}>{footerGroups.find((group) => group.id === 'legal')!.label[locale]}</p>
            <p className={styles.footerLegalLine}>© {business.year} {business.name}. {t.rights} <span className={styles.nowrap}>· {t.neq} {business.neq}</span></p>
            <ul className={styles.footerLegal}>
              {footerGroups.find((group) => group.id === 'legal')!.links.map((link) => <li key={link.path}><Link href={localizedHref(link.path, locale)}>{link.label[locale]}</Link></li>)}
              <li><Link href={switchLocaleHref(pathname, locale)} lang={locale === 'fr' ? 'en' : 'fr'} hrefLang={locale === 'fr' ? 'en-CA' : 'fr-CA'} aria-label={t.switchLabel}>{t.switchTo}</Link></li>
            </ul>
          </div>
        </div>
      </Container>
    </footer>
  );
}
