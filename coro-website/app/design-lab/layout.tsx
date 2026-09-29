import type { ReactNode } from 'react';
import { assertDesignLabEnabled } from './gate';

// Read at request time (never baked into the build), so a deployment can opt in with a runtime, server-side variable.
export const dynamic = 'force-dynamic';

/** Production gate: the internal Design Lab answers 404 unless DESIGN_LAB_ENABLED=true is set on the server. */
export default function DesignLabLayout({ children }: { children: ReactNode }) {
  assertDesignLabEnabled();
  return children;
}
