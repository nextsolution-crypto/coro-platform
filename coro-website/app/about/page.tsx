import type { Metadata } from 'next';
import { AboutV2 } from './AboutV2';
import { aboutContent } from './content';
import { organizationJsonLd } from '@/lib/site/json-ld';
import { localeFromSearchParams } from '@/lib/site/locale';
import { absoluteUrl, buildPageMetadata, SITE_URL } from '@/lib/site/seo';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const metadata = aboutContent[locale].metadata;
  return buildPageMetadata({
    path: '/about',
    locale,
    title: metadata.title,
    description: metadata.description,
  });
}

function JsonLd({ value }: { value: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(value).replace(/</g, '\\u003c') }}
    />
  );
}

export default async function AboutPage({ searchParams }: PageProps) {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const content = aboutContent[locale];
  const aboutPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: content.metadata.title,
    description: content.metadata.description,
    url: absoluteUrl('/about', locale),
    inLanguage: locale === 'fr' ? 'fr-CA' : 'en-CA',
    mainEntity: { '@type': 'Organization', name: 'CORO', url: SITE_URL },
    isPartOf: { '@type': 'WebSite', name: 'CORO', url: SITE_URL },
  };

  return (
    <>
      <JsonLd value={organizationJsonLd()} />
      <JsonLd value={aboutPageJsonLd} />
      <AboutV2 locale={locale} content={content} />
    </>
  );
}
