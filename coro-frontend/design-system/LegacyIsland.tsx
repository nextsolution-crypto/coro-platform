import type { ReactNode } from 'react';

export interface LegacyIslandProps {
  children: ReactNode;
  /**
   * Mécanisme d'exclusion : quand vrai, le contenu n'est PAS enveloppé. À employer pour une surface qui gère
   * elle-même son apparence ou qui ne doit pas être enveloppée. Au niveau d'une route, utiliser `island: false`
   * dans le registre.
   */
  exempt?: boolean;
}

/**
 * Îlot de compatibilité : conserve l'apparence claire historique d'un écran non migré lorsque le shell Glass est actif.
 *
 * Garanties techniques (voir .cg-legacy-island dans primitives.css) :
 *  - uniquement un fond, un liséré, des variables et color-scheme: light ;
 *  - AUCUN transform, filter, backdrop-filter, isolation, z-index, overflow ni contain : les modales à position fixe,
 *    menus flottants et éléments empilés de l'écran gardent le même bloc conteneur et le même contexte d'empilement
 *    qu'en Legacy, donc passent toujours au-dessus du shell ;
 *  - aucun sélecteur global : seuls les descendants de l'îlot sont concernés.
 */
export function LegacyIsland({ children, exempt = false }: LegacyIslandProps) {
  if (exempt) return <>{children}</>;
  return (
    <div className="cg-legacy-island" data-cg-island="">
      {children}
    </div>
  );
}
