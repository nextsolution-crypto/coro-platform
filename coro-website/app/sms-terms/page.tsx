import type { Metadata } from 'next';
import { LegalV2 } from '@/app/privacy/LegalV2';
import styles from '@/app/privacy/page.module.css';
import { V2Shell } from '@/components/site/V2Shell';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import { smsTermsContent } from './content';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content = smsTermsContent[locale];
  return buildPageMetadata({
    path: '/sms-terms',
    locale,
    title: content.metaTitle,
    description: content.metaDescription,
    absoluteTitle: true,
  });
}

export default async function SmsTermsPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content = smsTermsContent[locale];
  return (
    <V2Shell locale={locale} pathname="/sms-terms" headerTone="dark">
      <LegalV2
        content={content}
        id="sms-terms-title"
        extra={(section) =>
          'legalLinks' in section && section.legalLinks ? (
            <p>
              <a
                className={styles.crossLink}
                href={localizedHref('/privacy', locale)}
              >
                {content.privacyLabel}
              </a>{' '}
              ·{' '}
              <a
                className={styles.crossLink}
                href={localizedHref('/terms', locale)}
              >
                {content.generalTermsLabel}
              </a>
            </p>
          ) : null
        }
      />
    </V2Shell>
  );
}
