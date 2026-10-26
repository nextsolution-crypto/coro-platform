import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from './Accordion';
import { EditorialHero } from './EditorialHero';
import { EditorialBlock } from './EditorialBlock';
import { PageSection } from './PageSection';
import { knowledgeContent } from '@/lib/site/knowledge-content';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localizedHref, type Locale } from '@/lib/site/locale';
import styles from './KnowledgeProductPage.module.css';

export function KnowledgeProductPage({ kind, locale }: { kind: 'knowledge' | 'ai'; locale: Locale }) {
  const t = knowledgeContent[kind][locale];
  const path = kind === 'knowledge' ? '/coro-knowledge' : '/coro-ai';
  return <V2Shell locale={locale} pathname={path}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(t.faq.map(({ q, a }) => ({ question: q, answer: a })))).replace(/</g, '\\u003c') }} />
    <EditorialHero id={`${kind}-title`} label={t.name} title={t.title} lead={t.lead} actions={<Button href={localizedHref('/#demo', locale)}>{t.demo}</Button>} />
    <PageSection tone="navy" labelledBy={`${kind}-flow`}>
      <EditorialBlock id={`${kind}-flow`} heading={t.flowTitle} />
      <ol className={styles.flow}>{t.steps.map(step => <li key={step}>{step}</li>)}</ol>
    </PageSection>
    {t.sections.map((section, i) => <PageSection key={section.title} tone={i % 2 ? 'soft' : 'white'} labelledBy={`${kind}-section-${i}`}><EditorialBlock id={`${kind}-section-${i}`} heading={section.title}><p>{section.text}</p></EditorialBlock></PageSection>)}
    <PageSection tone="soft" labelledBy={`${kind}-limits`}><EditorialBlock id={`${kind}-limits`} heading={t.limitsTitle}><p>{t.limits}</p></EditorialBlock><p><a href={localizedHref(t.relatedHref, locale)}>{t.related} →</a></p><p><a href={localizedHref('/portail-client', locale)}>{locale === 'fr' ? 'Voir le portail client' : 'Explore the client portal'} →</a></p></PageSection>
    <PageSection tone="white" labelledBy={`${kind}-faq`}><EditorialBlock id={`${kind}-faq`} heading={t.faqTitle} /><Accordion label={t.faqTitle} items={t.faq.map(({q,a},i)=>({id:`${kind}-faq-${i}`,question:q,answer:a}))} /></PageSection>
    <CTASection id={`${kind}-cta`} tone="dark" label={t.name} statement={t.title} primary={{label:t.demo,href:localizedHref('/#demo',locale)}} />
  </V2Shell>;
}
