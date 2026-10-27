import type { Metadata } from 'next';
import { KnowledgeV2Page } from '@/components/page/KnowledgeV2Page';
import { knowledgeV2Content } from '@/lib/site/knowledge-v2-content';
import { localeFromSearchParams } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({searchParams}: P): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const t = knowledgeV2Content[locale];
  return buildPageMetadata({path:'/coro-knowledge', locale, title:t.seoTitle, description:t.seoDescription});
}
export default async function Page({searchParams}: P) {
  return <KnowledgeV2Page locale={localeFromSearchParams((await searchParams) ?? {})} />;
}
