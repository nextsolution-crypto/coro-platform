'use client';

import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/design-system/kit';

/**
 * Vue Liquid Glass de /settings (route bêta du registre).
 * Reçoit les sections TELLES QUE CALCULÉES par la page (y compris le filtrage par rôle) : ce composant ne décide
 * d'aucune permission et ne connaît aucune route. Il ne fait que présenter les données et déclencher la navigation
 * fournie par la page (même mécanisme qu'en Legacy : router.push depuis un bouton).
 *
 * Aucune couleur en dur : tokens --cg-* uniquement (cette vue n'est rendue que lorsque Glass est actif).
 */

export interface SettingsItem {
  icon: ReactNode;
  label: string;
  desc: string;
  path: string;
}

export interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

type Tone = 'info' | 'accent' | 'purple' | 'success' | 'warning' | 'neutral';

// Correspondance route → teinte sémantique (remplace les couleurs hexadécimales propres à chaque carte en Legacy).
const TONE_BY_PATH: Record<string, Tone> = {
  '/settings/profile': 'info',
  '/settings/organization': 'accent',
  '/settings/module1-template': 'purple',
  '/settings/users': 'success',
  '/settings/activity-types': 'purple',
  '/settings/timelog-categories': 'warning',
  '/settings/task-templates': 'info',
  '/settings/feedback': 'neutral',
};

const TONES: Record<Tone, { bg: string; fg: string }> = {
  info: { bg: 'var(--cg-info-bg)', fg: 'var(--cg-info-fg)' },
  accent: { bg: 'var(--cg-accent-soft)', fg: 'var(--cg-accent-text)' },
  purple: { bg: 'var(--cg-purple-bg)', fg: 'var(--cg-purple-fg)' },
  success: { bg: 'var(--cg-success-bg)', fg: 'var(--cg-success-fg)' },
  warning: { bg: 'var(--cg-warning-bg)', fg: 'var(--cg-warning-fg)' },
  neutral: { bg: 'var(--cg-neutral-bg)', fg: 'var(--cg-neutral-fg)' },
};

export default function SettingsGlassView({
  sections,
  onNavigate,
}: {
  sections: SettingsSection[];
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <PageHeader title="Paramètres" subtitle="Gérez votre profil et votre organisation" />

      <div className="space-y-7 sm:space-y-8">
        {sections.map((section, index) => {
          const headingId = `settings-section-${index}`;
          return (
            <section key={section.title} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--cg-text-muted)' }}
              >
                {section.title}
              </h2>

              <ul role="list" className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {section.items.map((item) => {
                  const tone = TONES[TONE_BY_PATH[item.path] ?? 'neutral'];
                  return (
                    <li key={item.path} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onNavigate(item.path)}
                        className="cg-glass cg-lift group w-full h-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 min-h-[72px] text-left cursor-pointer"
                      >
                        <span
                          aria-hidden="true"
                          className="cg-tile flex items-center justify-center flex-shrink-0 w-10 h-10 sm:w-11 sm:h-11"
                          style={{
                            backgroundColor: tone.bg,
                            color: tone.fg,
                            borderRadius: 'var(--cg-radius-lg)',
                            border: '1px solid var(--cg-glass-border)',
                          }}
                        >
                          {item.icon}
                        </span>

                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold leading-snug break-words" style={{ color: 'var(--cg-text-primary)' }}>
                            {item.label}
                          </span>
                          <span className="block text-xs sm:text-[13px] mt-1 leading-relaxed break-words" style={{ color: 'var(--cg-text-secondary)' }}>
                            {item.desc}
                          </span>
                        </span>

                        <ChevronRight
                          size={18}
                          aria-hidden="true"
                          className="flex-shrink-0 transition-transform group-hover:translate-x-0.5"
                          style={{ color: 'var(--cg-text-muted)' }}
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
