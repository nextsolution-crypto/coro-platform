import type { Metadata } from 'next';
import { AiV2Page } from '@/components/page/AiV2Page';
import { aiV2Content } from '@/lib/site/ai-v2-content';
import { localeFromSearchParams } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({searchParams}: P): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const t = aiV2Content[locale];
  return buildPageMetadata({path:'/coro-ai', locale, title:t.seoTitle, description:t.seoDescription});
}
export default async function Page({searchParams}: P) {
  return <AiV2Page locale={localeFromSearchParams((await searchParams) ?? {})} />;
}
