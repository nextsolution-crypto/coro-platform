import type { Locale } from '@/lib/site/locale';
import { SkipLink as SiteSkipLink } from '@/components/site/SkipLink';

/** Design Lab wrapper: same shared skip link, targeting the Lab's own main landmark. */
export function SkipLink({ locale, targetId = 'lab-main' }: { locale: Locale; targetId?: string }) {
  return <SiteSkipLink locale={locale} targetId={targetId} />;
}
