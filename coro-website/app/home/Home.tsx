import { V2Shell } from '@/components/site/V2Shell';
import type { Locale } from '@/lib/site/locale';
import { ReferralCapture } from './client/ReferralCapture';
import { getHomeContent } from './content';
import {
  Continuum,
  DemoSection,
  Documents,
  Ecosystem,
  EcosystemSolutions,
  FinalCta,
  Hero,
  InterventionImprovement,
  Resilience,
  Resources,
  Sentinelle,
  Tension,
  Trust,
} from './components/Sections';

/**
 * Homepage (MIG-08A). Server-rendered by default; the only client islands are `ReferralCapture` (cookie
 * attribution, §9 of the gate doc) and `DemoForm` (reused unchanged, §11). 12 sections (Incident + Exercises
 * merged into one compact InterventionImprovement band) per the approved
 * storyboard (docs/website-v2/05-migration/MIG-08-HOMEPAGE-GATE.md §26).
 */
export function Home({ locale }: { locale: Locale }) {
  const c = getHomeContent(locale);
  return (
    <V2Shell locale={locale} pathname="/" headerTone="dark">
      <ReferralCapture />
      <Hero c={c} locale={locale} />
      <Tension c={c} />
      <Continuum c={c} />
      <Ecosystem c={c} />
      <Documents c={c} />
      <Sentinelle c={c} />
      <InterventionImprovement c={c} />
      <Resilience c={c} />
      <EcosystemSolutions c={c} />
      <Trust c={c} />
      <DemoSection c={c} locale={locale} />
      <Resources c={c} />
      <FinalCta c={c} />
    </V2Shell>
  );
}
