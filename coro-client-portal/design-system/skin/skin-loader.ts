/**
 * Chargement paresseux de la feuille de teinte Glass (voir tools/build-skin.cjs).
 *
 * La feuille n'est liée au document QUE lorsque la route active est rendue en mode `skin` ou `canvas` ; elle est retirée
 * dès qu'on quitte ce type de route. En Classique et sur les routes non migrées, elle n'est donc jamais téléchargée ni évaluée.
 */
export const SKIN_LINK_ID = 'cg-skin-css';

/** Vrai si la feuille est (ou sera) nécessaire pour ce mode de route. */
export function skinNeeded(effectiveUi: string, routeMode: string): boolean {
  return effectiveUi === 'glass' && (routeMode === 'skin' || routeMode === 'canvas');
}

/**
 * Aligne le document sur le besoin. Retourne une promesse seulement si une feuille vient d'être ajoutée et n'est pas encore
 * chargée (l'appelant attend avant de révéler la page) ; sinon retourne null.
 */
export function syncSkinStylesheet(needed: boolean, href: string): Promise<void> | null {
  if (typeof document === 'undefined') return null;
  const existing = document.getElementById(SKIN_LINK_ID) as HTMLLinkElement | null;
  if (!needed) {
    existing?.remove();
    return null;
  }
  if (existing) {
    if (existing.getAttribute('href') === href && existing.sheet) return null;
    if (existing.getAttribute('href') === href) return waitFor(existing);
    existing.remove();
  }
  const link = document.createElement('link');
  link.id = SKIN_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
  return waitFor(link);
}

function waitFor(link: HTMLLinkElement): Promise<void> {
  return new Promise((resolve) => {
    if (link.sheet) return resolve();
    const done = () => {
      link.removeEventListener('load', done);
      link.removeEventListener('error', done);
      resolve();
    };
    link.addEventListener('load', done);
    link.addEventListener('error', done);
    // Garde-fou : ne jamais laisser la page masquée si le réseau est muet.
    setTimeout(done, 3000);
  });
}
