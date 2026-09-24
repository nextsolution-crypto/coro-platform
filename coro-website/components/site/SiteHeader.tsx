'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/lib/site/locale';
import { localizedHref } from '@/lib/site/locale';
import { DesktopNavigation } from './DesktopNavigation';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileNavigation } from './MobileNavigation';
import styles from './SiteShell.module.css';

export type SiteHeaderTone = 'light' | 'dark';

export function SiteHeader({ locale, pathname = '/', tone = 'light' }: { locale: Locale; pathname?: string; tone?: SiteHeaderTone }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); toggle.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [menuOpen]);
  const label = menuOpen ? (locale === 'fr' ? 'Fermer le menu' : 'Close menu') : (locale === 'fr' ? 'Ouvrir le menu' : 'Open menu');
  return (
    <header className={`${styles.header} ${tone === 'dark' ? styles.headerDark : ''}`} data-surface={tone === 'dark' ? 'dark' : undefined}>
      <div className={styles.headerInner}>
        <Link className={styles.logo} href={localizedHref('/', locale)} aria-label={locale === 'fr' ? 'CORO — Accueil' : 'CORO — Home'}>CO<span>RO</span></Link>
        <DesktopNavigation locale={locale} />
        <div className={styles.headerActions}>
          <LanguageSwitcher locale={locale} pathname={pathname} />
          <a className={styles.login} href="https://app.getcoro.io/login">{locale === 'fr' ? 'Connexion' : 'Login'}</a>
          <Link className={styles.demo} href={localizedHref('/#demo', locale)}>{locale === 'fr' ? 'Demander une démo' : 'Request a demo'}</Link>
        </div>
        <button ref={toggle} className={styles.menuToggle} type="button" aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined} onClick={() => setMenuOpen((value) => !value)}>
          <span className={styles.srOnly}>{label}</span>
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>
      {menuOpen && <div id={menuId} className={styles.mobilePanel}><MobileNavigation locale={locale} onNavigate={() => setMenuOpen(false)} /></div>}
    </header>
  );
}
