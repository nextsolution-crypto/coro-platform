import type { Metadata } from 'next';
import { V2Shell } from '@/components/site/V2Shell';
import { localeFromSearchParams } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
import { DiagnosticExperience } from './DiagnosticExperience';

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
const copy = {
  fr: { title: 'Diagnostic de préparation organisationnelle', description: "Évaluez gratuitement votre préparation aux situations d'urgence en huit questions. Découvrez vos forces et vos priorités d'amélioration avec CORO." },
  en: { title: 'Organizational Preparedness Assessment', description: "Assess your organization's emergency preparedness in eight questions. Discover your strengths and improvement priorities with CORO." },
} as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const t = copy[locale];
  return buildPageMetadata({ path: '/diagnostic', locale, title: t.title, description: t.description, indexable: true });
}

export default async function DiagnosticPage({ searchParams }: Props) {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  return <V2Shell locale={locale} pathname="/diagnostic"><DiagnosticExperience locale={locale} /></V2Shell>;
}
