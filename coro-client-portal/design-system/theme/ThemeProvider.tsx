'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import type { ResolvedTheme, ThemePreference, UiGeneration } from './theme-core';
import type { RouteMode } from '../routes/route-matcher';
import {
  getServerSnapshot,
  getSnapshot,
  reapplyCurrentTheme,
  setActivePathname,
  setSkinFailed,
  setThemePreference,
  setUiGeneration,
  subscribe,
} from './theme-store';
import { SKIN_HREF } from '../skin/skin-asset';
import { skinNeeded, syncSkinStylesheet } from '../skin/skin-loader';

export interface ThemeContextValue {
  /** Préférence choisie : LIGHT, DARK ou SYSTEM. */
  preference: ThemePreference;
  /** Thème effectivement appliqué (SYSTEM résolu). */
  resolvedTheme: ResolvedTheme;
  /**
   * Génération d'interface EFFECTIVE sur la route active : 'glass' seulement si l'utilisateur l'a choisie ET que la
   * route a un shell Glass. C'est cette valeur que les écrans doivent lire pour choisir leur rendu.
   */
  ui: UiGeneration;
  /** Génération choisie par l'utilisateur (à afficher dans le sélecteur d'apparence). */
  uiPreference: UiGeneration;
  /** Mode de rendu de la route : 'glass' | 'island' | 'bare' | 'legacy' (voir routes/route-matcher). */
  routeMode: RouteMode;
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
  const pathname = usePathname();

  // En développement, le remontage Strict Mode de React efface les attributs de <html>
  // posés par le script : on les réapplique avant le rendu (sans effet en production).
  useLayoutEffect(() => {
    reapplyCurrentTheme();
  }, []);

  // La route active décide si le shell Glass s'applique (registre de routes). Mis à jour avant la peinture.
  useLayoutEffect(() => {
    setActivePathname(pathname);
  }, [pathname]);

  // Le HTML serveur est toujours rendu en Legacy. On signale « prêt » (data-ui-ready) seulement
  // quand le rendu React correspond au rendu effectif réel ; tokens.css masque la page en Glass
  // tant que ce n'est pas le cas, ce qui supprime le flash Legacy. Aucun effet en Legacy.
  // En mode skin / canvas, la page reste masquée tant que la feuille de teinte n'est pas chargée (sinon flash Legacy illisible en Dark).
  useLayoutEffect(() => {
    const matchesActualRender = snapshot.effectiveUi === getSnapshot().effectiveUi;
    if (!matchesActualRender) return;
    const root = document.documentElement;
    const pending = syncSkinStylesheet(skinNeeded(snapshot.effectiveUi, snapshot.routeMode), SKIN_HREF);
    if (!pending) {
      root.setAttribute('data-ui-ready', '');
      return;
    }
    root.removeAttribute('data-ui-ready');
    let cancelled = false;
    pending.then((loaded) => {
      if (cancelled) return;
      // Feuille absente (hors ligne, fichier manquant) : retour au Classique plutôt qu'un Glass non teinté illisible.
      if (!loaded) setSkinFailed(true);
      root.setAttribute('data-ui-ready', '');
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  const setPreference = useCallback((preference: ThemePreference) => setThemePreference(preference), []);
  const setUi = useCallback((ui: UiGeneration) => setUiGeneration(ui), []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference: snapshot.preference,
      resolvedTheme: snapshot.resolvedTheme,
      ui: snapshot.effectiveUi,
      uiPreference: snapshot.ui,
      routeMode: snapshot.routeMode,
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
