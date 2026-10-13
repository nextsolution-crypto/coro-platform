import type { Metadata } from 'next';
import { V2Shell } from '@/components/site/V2Shell';
import { localeFromSearchParams, localizedHref } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import { LegalV2 } from './LegalV2';
import { privacyContent } from './content';
import styles from './page.module.css';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content = privacyContent[locale];
  return buildPageMetadata({ path: '/privacy', locale, title: content.metaTitle, description: content.metaDescription, absoluteTitle: true });
}

export default async function PrivacyPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content = privacyContent[locale];
  return (
    <V2Shell locale={locale} pathname="/privacy" headerTone="dark">
      <LegalV2
        content={content}
        id="privacy-title"
        extra={(section) =>
          section.title.startsWith('6A.') ? (
            <p>
              <a
                className={styles.crossLink}
                href={localizedHref('/sms-terms', locale)}
              >
                {locale === 'fr' ? 'Conditions des messages SMS' : 'SMS Terms'}
              </a>
            </p>
          ) : null
        }
      />
    </V2Shell>
  );
}
