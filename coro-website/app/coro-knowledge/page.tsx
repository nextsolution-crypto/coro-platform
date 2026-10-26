import type { Metadata } from 'next';
import { KnowledgeProductPage } from '@/components/page/KnowledgeProductPage';
import { knowledgeContent } from '@/lib/site/knowledge-content';
import { localeFromSearchParams } from '@/lib/site/locale';
import { buildPageMetadata } from '@/lib/site/seo';
type P = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
export async function generateMetadata({searchParams}: P): Promise<Metadata> {
  const locale = localeFromSearchParams((await searchParams) ?? {});
  const t = knowledgeContent.knowledge[locale];
  return buildPageMetadata({path:'/coro-knowledge', locale, title:t.title, description:t.description});
}
export default async function Page({searchParams}: P) {
  return <KnowledgeProductPage kind="knowledge" locale={localeFromSearchParams((await searchParams) ?? {})} />;
}
