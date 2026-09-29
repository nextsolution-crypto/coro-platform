import type { Locale } from './locale.ts';
import { absoluteUrl, SITE_URL } from './seo.ts';
export type BreadcrumbItem = { name: string; path: string }; export type FaqItem = { question: string; answer: string };
export function organizationJsonLd() { return { '@context': 'https://schema.org', '@type': 'Organization', name: 'CORO', url: SITE_URL, logo: absoluteUrl('/coro-logo.png') }; }
export function webPageJsonLd(input: { path: string; locale: Locale; name: string; description: string }) { return { '@context': 'https://schema.org', '@type': 'WebPage', name: input.name, description: input.description, url: absoluteUrl(input.path, input.locale), inLanguage: input.locale === 'fr' ? 'fr-CA' : 'en-CA', isPartOf: { '@type': 'WebSite', name: 'CORO', url: SITE_URL } }; }
export function breadcrumbJsonLd(items: readonly BreadcrumbItem[]) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })) }; }
export function faqJsonLd(items: readonly FaqItem[]) { return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((item) => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) }; }
