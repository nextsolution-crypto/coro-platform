import { notFound } from 'next/navigation';
import { isDesignLabEnabled } from '@/lib/site/design-lab-gate';

/**
 * Server-side production gate. Called by BOTH the layout and the page: a layout and its page render concurrently, so gating the
 * layout alone would still stream the Lab content inside the 404 response body.
 */
export function assertDesignLabEnabled(): void {
  if (!isDesignLabEnabled({ nodeEnv: process.env.NODE_ENV, explicitFlag: process.env.DESIGN_LAB_ENABLED })) notFound();
}
