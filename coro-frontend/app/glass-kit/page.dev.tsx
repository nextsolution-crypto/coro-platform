import { notFound } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import GlassKitPlayground from '@/design-system/dev/GlassKitPlayground';

/**
 * Terrain d'essai des primitives Liquid Glass — OUTIL DE DÉVELOPPEMENT.
 *
 * Protection en production, à deux niveaux :
 *  1. Le nom `page.dev.tsx` : l'extension `dev.tsx` n'est reconnue que hors production (next.config.ts). Dans un build de
 *     production, cette page n'est ni routée ni compilée : l'URL répond comme n'importe quelle route inexistante.
 *  2. Ce garde-fou : si le fichier était renommé en `page.tsx` par erreur, la route répondrait quand même par un 404.
 */
export default function GlassKitPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <AppLayout>
      <GlassKitPlayground />
    </AppLayout>
  );
}
