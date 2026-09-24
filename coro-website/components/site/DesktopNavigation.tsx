'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import type { Locale } from '@/lib/site/locale';
import { visibleNavigation } from '@/lib/site/navigation';
import styles from './SiteShell.module.css';

type OpenState = { group: string; by: 'pointer' | 'click' } | null;

/**
 * Disclosure-style primary navigation.
 * - Buttons expose aria-expanded / aria-controls and open on click, Enter or Space.
 * - Pointer hover still previews a menu (visual convenience only; never required).
 * - Escape closes the open menu and, when focus was inside the nav, returns it to the trigger.
 * - Focus leaving a group closes it, so tab order stays predictable.
 */
export function DesktopNavigation({ locale }: { locale: Locale }) {
  const [open, setOpen] = useState<OpenState>(null);
  const nav = useRef<HTMLElement>(null);
  const baseId = useId();
  const openGroup = open?.group;

  useEffect(() => {
    if (!openGroup) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const trigger = nav.current?.querySelector<HTMLButtonElement>(`[data-group="${openGroup}"] > button`);
      const focusInside = nav.current?.contains(document.activeElement);
      setOpen(null);
      if (focusInside) trigger?.focus();
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [openGroup]);

  return (
    <nav ref={nav} className={styles.desktopNav} aria-label={locale === 'fr' ? 'Navigation principale' : 'Main navigation'}>
      {visibleNavigation(locale).map((group) => {
        const expanded = openGroup === group.id;
        const menuId = `${baseId}-${group.id}`;
        return (
          <div
            className={styles.dropdown}
            key={group.id}
            data-group={group.id}
            data-open={expanded}
            onMouseEnter={() => setOpen((current) => current ?? { group: group.id, by: 'pointer' })}
            onMouseLeave={() => setOpen((current) => (current?.by === 'pointer' ? null : current))}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen((current) => (current?.group === group.id ? null : current)); }}
          >
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={menuId}
              onClick={() => setOpen(expanded && open?.by === 'click' ? null : { group: group.id, by: 'click' })}
            >
              {group.label[locale]}<span aria-hidden="true">⌄</span>
            </button>
            <div className={styles.megaMenu} id={menuId}>
              {group.items.map((entry) => <Link key={entry.id} href={entry.href!} onClick={() => setOpen(null)}>{entry.label[locale]}</Link>)}
            </div>
          </div>
        );
      })}
      <Link className={styles.directLink} href={locale === 'fr' ? '/pricing' : '/pricing?lang=en'}>{locale === 'fr' ? 'Tarification' : 'Pricing'}</Link>
    </nav>
  );
}
