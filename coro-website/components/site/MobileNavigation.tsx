'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/lib/site/locale';
import { localizedHref } from '@/lib/site/locale';
import { visibleNavigation } from '@/lib/site/navigation';
import styles from './SiteShell.module.css';

/**
 * Mobile navigation panel. Mounted only while the menu is open, so focus moves to the
 * first group trigger on open (the header returns it to the menu toggle on close).
 * Groups are disclosure buttons (aria-expanded / aria-controls); nothing depends on hover.
 */
export function MobileNavigation({ locale, onNavigate }: { locale: Locale; onNavigate: () => void }) {
  const [openGroup, setOpenGroup] = useState<string>();
  const firstTrigger = useRef<HTMLButtonElement>(null);
  const baseId = useId();
  useEffect(() => { firstTrigger.current?.focus(); }, []);
  return (
    <nav className={styles.mobileNav} aria-label={locale === 'fr' ? 'Navigation mobile' : 'Mobile navigation'}>
      {visibleNavigation(locale).map((group, index) => {
        const open = openGroup === group.id;
        const panelId = `${baseId}-${group.id}`;
        return (
          <section key={group.id}>
            <button ref={index === 0 ? firstTrigger : undefined} type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpenGroup(open ? undefined : group.id)}>
              {group.label[locale]}<span aria-hidden="true">{open ? '−' : '+'}</span>
            </button>
            <div id={panelId} hidden={!open}>
              {group.items.map((entry) => <Link key={entry.id} href={entry.href!} onClick={onNavigate}>{entry.label[locale]}</Link>)}
            </div>
          </section>
        );
      })}
      <Link href={localizedHref('/pricing', locale)} onClick={onNavigate}>{locale === 'fr' ? 'Tarification' : 'Pricing'}</Link>
      <div className={styles.mobileActions}>
        <a href="https://app.getcoro.io/login">{locale === 'fr' ? 'Connexion' : 'Login'}</a>
        <Link href={localizedHref('/#demo', locale)} onClick={onNavigate}>{locale === 'fr' ? 'Demander une démo' : 'Request a demo'}</Link>
      </div>
    </nav>
  );
}
