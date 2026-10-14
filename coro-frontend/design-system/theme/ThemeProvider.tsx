'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import type { ResolvedTheme, ThemePreference, UiGeneration } from './theme-core';
import {
  getServerSnapshot,
  getSnapshot,
  reapplyCurrentTheme,
  setThemePreference,
  setUiGeneration,
  subscribe,
} from './theme-store';

export interface ThemeContextValue {
  /** Préférence choisie : LIGHT, DARK ou SYSTEM. */
  preference: ThemePreference;
  /** Thème effectivement appliqué (SYSTEM résolu). */
  resolvedTheme: ResolvedTheme;
  /** Génération d'interface : 'legacy' (défaut) ou 'glass'. Indépendante du thème. */
  ui: UiGeneration;
  setPreference: (preference: ThemePreference) => void;
  setUi: (ui: UiGeneration) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Fournit l'état du thème. N'émet aucun DOM.
 * Hydratation : le rendu serveur et le premier rendu client utilisent le même snapshot
 * (legacy / SYSTEM / light) ; la vraie valeur est appliquée à <html> par le script
 * anti-flash avant le premier rendu, puis lue ici sans rechargement.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // En développement, le remontage Strict Mode de React efface les attributs de <html>
  // posés par le script : on les réapplique avant le rendu (sans effet en production).
  useLayoutEffect(() => {
    reapplyCurrentTheme();
  }, []);

  // Le HTML serveur est toujours rendu en Legacy. On signale « prêt » (data-ui-ready) seulement
  // quand le rendu React correspond à la génération réelle ; tokens.css masque la page en Glass
  // tant que ce n'est pas le cas, ce qui supprime le flash Legacy. Aucun effet en Legacy.
  useLayoutEffect(() => {
    if (snapshot.ui === getSnapshot().ui) document.documentElement.setAttribute('data-ui-ready', '');
  }, [snapshot]);

  const setPreference = useCallback((preference: ThemePreference) => setThemePreference(preference), []);
  const setUi = useCallback((ui: UiGeneration) => setUiGeneration(ui), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference: snapshot.preference,
      resolvedTheme: snapshot.resolvedTheme,
      ui: snapshot.ui,
      setPreference,
      setUi,
    }),
    [snapshot, setPreference, setUi],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme doit être utilisé à l’intérieur de <ThemeProvider>.');
  return context;
}
