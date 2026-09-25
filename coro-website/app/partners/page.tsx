import type { Metadata } from 'next';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

// `title` is the on-page label; `metaTitle` is the document title WITHOUT the brand (the root template appends " | CORO").
// Desired partner CATEGORIES only. CORO names no partner, shows no logo and claims no existing partnership on this page.
const c = {
  fr: { title: 'Partenaires CORO', metaTitle: 'Partenaires et collaborations', description: 'Découvrez l’écosystème de partenaires CORO pour les professionnels du bâtiment, de la sécurité et de la résilience.', h1: 'Un écosystème qui relie expertise et opérations.', intro: 'CORO collabore avec les professionnels qui accompagnent les organisations dans la sécurité incendie, les mesures d’urgence, la continuité, la gestion immobilière et la résilience.', who: 'À qui s’adresse cet écosystème?', items: ['Consultants et firmes-conseils', 'Professionnels en sécurité incendie et mesures d’urgence', 'Gestionnaires immobiliers et spécialistes du risque', 'Intégrateurs et fournisseurs de solutions complémentaires'], model: 'Un cadre adapté à chaque collaboration', modelText: 'Recommandation, accompagnement, intégration ou revente peuvent être envisagés selon le contexte et doivent faire l’objet d’une entente écrite.', flow: ['Expertise', 'Collaboration', 'Valeur pour l’organisation'], cta: 'Discuter d’une collaboration', ref: 'Voir le programme de recommandation', ecosystem: 'Écosystème CORO' },
  en: { title: 'CORO Partners', metaTitle: 'Partners and collaborations', description: 'Discover the CORO partner ecosystem for building, safety and resilience professionals.', h1: 'An ecosystem connecting expertise and operations.', intro: 'CORO works with professionals supporting organizations in fire safety, emergency management, continuity, property management and resilience.', who: 'Who is this ecosystem for?', items: ['Consultants and advisory firms', 'Fire safety and emergency management professionals', 'Property managers and risk specialists', 'Integrators and complementary solution providers'], model: 'A framework suited to each collaboration', modelText: 'Referral, advisory, integration or resale relationships may be considered depending on context and require a written agreement.', flow: ['Expertise', 'Collaboration', 'Value for the organization'], cta: 'Discuss a collaboration', ref: 'View the referral program', ecosystem: 'CORO ecosystem' },
} as const;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = c[l];
  return buildPageMetadata({ path: '/partners', locale: l, title: t.metaTitle, description: t.description });
}

/** /partners (MIG-01C): rendered inside V2Shell; content only. */
export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = c[l];
  return (
    <V2Shell locale={l} pathname="/partners">
      <EditorialHero id="partners-title" label={t.title} title={t.h1} lead={t.intro} photo={{ src: '/website-v2/partners/partners-coro-collaboration.webp', side: 'end', position: '50% 40%', mobilePosition: '50% 45%' }} actions={<Button href={localizedHref('/contact', l)} surface="dark">{t.cta}</Button>} />

      <PageSection tone="soft" labelledBy="partners-who-title">
        <SplitContent ratio="5-7" align="start" text={<EditorialBlock id="partners-who-title" heading={t.who} />} media={<ol className={styles.cards}>{t.items.map((item) => <li key={item}><h3>{item}</h3></li>)}</ol>} />
      </PageSection>

      <PageSection tone="white" labelledBy="partners-model-title">
        <SplitContent
          ratio="7-5"
          align="start"
          text={<div className={styles.stack}><EditorialBlock id="partners-model-title" label={t.ecosystem} heading={t.model}><p>{t.modelText}</p></EditorialBlock><div className={styles.actions}><Button href={localizedHref('/programme-recommandation', l)} variant="ghost">{t.ref}</Button></div></div>}
          media={<ol className={styles.list}>{t.flow.map((step) => <li key={step}><strong>{step}</strong></li>)}</ol>}
        />
      </PageSection>
    </V2Shell>
  );
}
