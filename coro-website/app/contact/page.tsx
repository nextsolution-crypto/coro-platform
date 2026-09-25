import type { Metadata } from 'next';
import DemoForm from '@/app/DemoForm';
import { EditorialBlock } from '@/components/page/EditorialBlock';
import { PageSection } from '@/components/page/PageSection';
import { SplitContent } from '@/components/page/SplitContent';
import { V2Shell } from '@/components/site/V2Shell';
import { localeFromSearchParams } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from './page.module.css';

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

const copy = {
  fr: { title: 'Contactez CORO', description: 'Communiquez avec CORO pour poser une question, discuter de vos besoins ou demander une démonstration.', h1: 'Parlons de vos besoins.', intro: 'Vous souhaitez découvrir CORO, discuter d’un besoin précis ou demander une démonstration? Écrivez-nous ou utilisez le formulaire.', form: 'Demander une démonstration', formText: 'Présentez-nous brièvement votre organisation et votre besoin.', email: 'Courriel', phone: 'Téléphone', address: 'Adresse', reach: 'Communiquez avec nous', reachText: 'Choisissez le moyen qui vous convient pour amorcer la conversation.' },
  en: { title: 'Contact CORO', description: 'Contact CORO to ask a question, discuss your needs or request a platform demonstration.', h1: 'Let’s discuss your needs.', intro: 'Would you like to discover CORO, discuss a specific need or request a demonstration? Email us or use the form.', form: 'Request a demonstration', formText: 'Tell us briefly about your organization and your needs.', email: 'Email', phone: 'Phone', address: 'Address', reach: 'Contact us', reachText: 'Choose the channel that works for you to start the conversation.' },
} as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  return buildPageMetadata({ path: '/contact', locale, title: copy[locale].title, description: copy[locale].description });
}

/** /contact (MIG-01B): rendered inside V2Shell. The production DemoForm is unchanged; the page only composes around it. */
export default async function Page({ searchParams }: Props) {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[locale];
  return (
    <V2Shell locale={locale} pathname="/contact">
      <PageSection tone="white" labelledBy="contact-title">
        <div className={styles.hero}>
          <p className={styles.heroLabel}>Contact</p>
          <h1 id="contact-title" className={styles.heroTitle}>{t.h1}</h1>
          <p className={styles.heroLead}>{t.intro}</p>
        </div>
      </PageSection>

      <PageSection tone="soft" labelledBy="contact-form-title">
        <SplitContent
          ratio="7-5"
          align="start"
          text={<div className={styles.formPanel}><EditorialBlock id="contact-form-title" heading={t.form} size="md"><p>{t.formText}</p></EditorialBlock><DemoForm lang={locale} /></div>}
          media={
            <div className={styles.reach}>
              <EditorialBlock label="CORO" heading={t.reach} size="md"><p>{t.reachText}</p></EditorialBlock>
              <dl className={styles.details}>
                <div><dt>{t.email}</dt><dd><a href="mailto:info@getcoro.io">info@getcoro.io</a></dd></div>
                <div><dt>{t.phone}</dt><dd><a href="tel:+15147917871">+1 (514) 791-7871</a></dd></div>
                <div><dt>{t.address}</dt><dd><address className={styles.address}><span>2879, boul. Pierre-Bernard</span><span>Montréal (Québec) <span className={styles.nowrap}>H1L 4R2</span></span><span>Canada</span></address></dd></div>
              </dl>
            </div>
          }
        />
      </PageSection>
    </V2Shell>
  );
}
