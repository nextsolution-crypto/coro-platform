import type { Metadata } from 'next';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { EditorialHero } from '@/components/page/EditorialHero';
import { FeatureIndex } from '@/components/page/FeatureIndex';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

// PROGRAM TERMS ARE PUBLISHED FACTS: the $250 amount and every condition below are copied unchanged from the previous page.
// `metaTitle` is the document title WITHOUT the brand (the root template appends " | CORO").
const c = {
  fr: {
    metaTitle: 'Programme de recommandation — Recevez 250 $ de crédit',
    description: 'Recommandez CORO à une organisation et recevez un crédit CORO de 250 $ lorsqu’elle devient un client admissible.',
    intro: 'Partagez votre lien personnel. Lorsqu’une organisation devient un client admissible, votre organisation peut recevoir un crédit CORO de 250 $.',
    reward: 'de crédit CORO par recommandation admissible',
    steps: ['Depuis Administration → Recommandations, partagez votre lien personnel ou votre code.', 'L’organisation utilise votre lien pour découvrir CORO ou demander une démonstration.', 'Après conversion et validation de l’admissibilité, un crédit de 250 $ est approuvé.'],
    account: 'Votre espace CORO centralise le lien, le code, le statut, les crédits approuvés et appliqués, ainsi que l’historique.',
    conditions: ['Nouveau prospect qui n’est ni client ni engagé dans une démarche commerciale active.', 'Une seule organisation référente par organisation recommandée.', 'Aucune auto-recommandation ou contournement de la tarification.', 'Admissibilité et conversion validées par CORO.', 'Crédit sans valeur monétaire, applicable uniquement aux services CORO admissibles.', 'CORO peut modifier, suspendre ou mettre fin au programme.'],
    login: 'Accéder à mon espace CORO',
    demo: 'Demander une démonstration',
    terms: 'Le crédit de 250 $ est soumis aux conditions du programme et à la validation de CORO.',
    label: 'Programme de recommandation', lines: ['Recommandez CORO.', 'Recevez 250\u00a0$ de crédit.'], amount: '250\u00a0$', rewardLabel: 'Crédit de recommandation',
    journey: 'Le parcours', journeyTitle: 'Recommander → Attribution → Crédit', stepLabels: ['Partagez', 'Découverte de CORO', 'Validation et crédit'],
    tracking: 'Suivi et admissibilité', trackingTitle: 'Suivez tout dans CORO',
  },
  en: {
    metaTitle: 'Referral Program — Receive $250 in credit',
    description: 'Refer CORO to an organization and receive $250 in CORO credit when it becomes an eligible customer.',
    intro: 'Share your personal link. When an organization becomes an eligible customer, your organization may receive $250 in CORO credit.',
    reward: 'in CORO credit per eligible referral',
    steps: ['From Administration → Referrals, share your personal link or code.', 'The organization uses your link to discover CORO or request a demonstration.', 'After conversion and eligibility validation, a $250 credit is approved.'],
    account: 'Your CORO account centralizes your link, code, status, approved and applied credits, and referral history.',
    conditions: ['A new prospect that is neither a customer nor in an active sales process.', 'Only one referring organization per referred organization.', 'No self-referral or circumvention of pricing.', 'Eligibility and conversion validated by CORO.', 'No cash value; applies only to eligible CORO services.', 'CORO may modify, suspend or end the program.'],
    login: 'Access my CORO account',
    demo: 'Request a demonstration',
    terms: 'The $250 credit is subject to program conditions and CORO validation.',
    label: 'Referral program', lines: ['Refer CORO.', 'Receive $250 in credit.'], amount: '$250', rewardLabel: 'Referral credit',
    journey: 'The journey', journeyTitle: 'Refer → Attribution → Credit', stepLabels: ['Share', 'Discover CORO', 'Validation and credit'],
    tracking: 'Tracking and eligibility', trackingTitle: 'Track everything in CORO',
  },
} as const;

export async function generateMetadata({ searchParams }: P): Promise<Metadata> {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = c[l];
  return buildPageMetadata({ path: '/programme-recommandation', locale: l, title: t.metaTitle, description: t.description });
}

/** /programme-recommandation (MIG-01D): rendered inside V2Shell; content only. Referral capture and cookies stay on the homepage and DemoForm. */
export default async function Page({ searchParams }: P) {
  const l = localeFromSearchParams((await searchParams) ?? {});
  const t = c[l];
  return (
    <V2Shell locale={l} pathname="/programme-recommandation">
      <EditorialHero id="referral-title" label={t.label} title={t.lines} lead={t.intro} photo={{ src: '/website-v2/referral/referral-coro-conversation.webp', side: 'end', position: '55% 35%', mobilePosition: '50% 30%' }} actions={<><Button href="https://app.getcoro.io/login" surface="dark">{t.login}</Button><Button href={localizedHref('/#demo', l)} variant="ghost" surface="dark">{t.demo}</Button></>} />

      <PageSection tone="soft" density="compact" labelledBy="referral-reward-title">
        <div className={styles.reward}>
          <p className={styles.amount}>{t.amount}</p>
          <div className={styles.rewardText}>
            <p className={styles.rewardLabel}>{t.rewardLabel}</p>
            <h2 id="referral-reward-title" className={styles.rewardTitle}>{t.reward}</h2>
          </div>
        </div>
      </PageSection>

      <PageSection tone="white" labelledBy="referral-journey-title">
        <div className={styles.stack}>
          <EditorialBlock id="referral-journey-title" label={t.journey} heading={t.journeyTitle} />
          <FeatureIndex layout="steps" label={t.journeyTitle} items={t.steps.map((text, i) => ({ title: t.stepLabels[i], text }))} />
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="referral-tracking-title">
        <SplitContent ratio="5-7" align="start" text={<EditorialBlock id="referral-tracking-title" label={t.tracking} heading={t.trackingTitle}><p>{t.account}</p></EditorialBlock>} media={<ol className={styles.conditions} aria-label={t.tracking}>{t.conditions.map((condition) => <li key={condition}><p>{condition}</p></li>)}</ol>} />
      </PageSection>

      <PageSection tone="white" density="compact">
        <p className={styles.note}>{t.terms}</p>
      </PageSection>
    </V2Shell>
  );
}
