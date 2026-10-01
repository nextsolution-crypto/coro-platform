import type { Metadata } from 'next';
import { V2Shell } from '@/components/site/V2Shell';
import { LegalV2 } from '@/app/privacy/LegalV2';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import styles from '@/app/privacy/page.module.css';
import { termsContent, type TermsContent } from './content';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content = termsContent[locale];
  return buildPageMetadata({ path: '/terms', locale, title: content.metaTitle, description: content.metaDescription, absoluteTitle: true });
}

export default async function TermsPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content: TermsContent = termsContent[locale];
  const privacyHref = localizedHref('/privacy', locale);
  return (
    <V2Shell locale={locale} pathname="/terms" headerTone="dark">
      <LegalV2
        content={content}
        id="terms-title"
        extra={(section) => {
          if ('smsLinks' in section && section.smsLinks) {
            return (
              <p>
                <a className={styles.crossLink} href="https://getcoro.io/terms">{locale === 'fr' ? 'Conditions d’utilisation' : 'Terms of Service'}</a>
                {' · '}
                <a className={styles.crossLink} href="https://getcoro.io/privacy">{locale === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy'}</a>
              </p>
            );
          }
          return ('privacyLink' in section && section.privacyLink) ? (
            <p><a className={styles.crossLink} href={privacyHref}>{content.privacyLinkLabel}</a></p>
          ) : null;
        }}
      />
    </V2Shell>
  );
}
