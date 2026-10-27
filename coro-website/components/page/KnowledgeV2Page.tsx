import Image from 'next/image';
import { V2Shell } from '@/components/site/V2Shell';
import { Button } from '@/components/ui/Button';
import { CTASection } from '@/components/conversion/CTASection';
import { Accordion } from './Accordion';
import { knowledgeV2Content } from '@/lib/site/knowledge-v2-content';
import { faqJsonLd } from '@/lib/site/json-ld';
import { localizedHref, type Locale } from '@/lib/site/locale';
import styles from './KnowledgeV2Page.module.css';

const base = '/images/Coro_Knowledge/';

function SectionTitle({ number, title, intro, dark = false }: { number: string; title: string; intro?: string; dark?: boolean }) {
  const sectionNumber = String(Number.parseInt(number, 10) + 1).padStart(2, '0');
  return <header className={styles.sectionHeader} data-dark={dark || undefined}>
    <p className={styles.kicker}>{sectionNumber}</p><h2>{title}</h2>{intro && <p>{intro}</p>}
  </header>;
}

function Picture({ file, alt, className = '' }: { file: string; alt: string; className?: string }) {
  return <div className={`${styles.picture} ${className}`}><Image src={`${base}${file}`} alt={alt} fill sizes="(max-width: 768px) 100vw, 1200px" /></div>;
}

export function KnowledgeV2Page({ locale }: { locale: Locale }) {
  const t = knowledgeV2Content[locale];
  const imageAlt = (title: string) => locale === 'fr' ? `Illustration : ${title}` : `Illustration: ${title}`;
  return <V2Shell locale={locale} pathname="/coro-knowledge">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(t.faq.map(([q,a]) => ({ question:q, answer:a })))).replace(/</g,'\\u003c') }} />

    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="knowledge-title">
        <div className={styles.heroCopy}><p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="knowledge-title">{t.heroTitle}</h1><p>{t.heroLead}</p><div className={styles.actions}><Button href={localizedHref('/#demo',locale)}>{t.demo}</Button><Button href={localizedHref('/coro-ai',locale)} variant="ghost">{t.discoverAi}</Button></div></div>
        <Picture file="coro-knowledge-batiment-commercial.webp" alt={t.imageAlt} className={styles.heroImage} />
      </section>

      <section className={styles.navy}><div className={styles.inner}><SectionTitle number="01 — LE PROBLÈME" title={t.problemTitle} intro={t.problemText} dark /><div className={styles.fourGrid}>{t.problems.map(([title,text])=><article className={styles.darkCard} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div><p className={styles.conclusion}>{t.problemEnd}</p></div></section>

      <section className={styles.white}><div className={`${styles.inner} ${styles.split}`}><div><SectionTitle number="02 — LE BÂTIMENT" title={t.buildingTitle} intro={t.buildingText} /><ul className={styles.pills}>{t.buildingItems.map(x=><li key={x}>{x}</li>)}</ul><p className={styles.qualifier}>{t.future}</p></div><Picture file="coro-knowledge-immeuble-referentiel.webp" alt={imageAlt(t.buildingTitle)} /></div></section>

      <section className={styles.soft}><div className={styles.inner}><SectionTitle number="03 — LA BIBLIOTHÈQUE" title={t.libraryTitle} intro={t.libraryIntro} /><div className={styles.categoryGrid}>{t.categories.map(([file,title,text])=><article className={styles.imageCard} key={file}><Picture file={file} alt={imageAlt(title)} /><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>

      <section className={styles.white}><div className={styles.inner}><SectionTitle number="04 — DE LA SOURCE À LA CONNAISSANCE" title={t.lifecycleTitle} intro={t.lifecycleIntro} /><ol className={styles.steps}>{t.lifecycle.map(([title,text],i)=><li key={title}><span>{String(i+1).padStart(2,'0')}</span><h3>{title}</h3><p>{text}</p></li>)}</ol><figure className={styles.productFigure}><Picture file="coro-knowledge-interface-bibliotheque-documents.webp" alt={imageAlt(t.libraryTitle)} /><figcaption>{t.libraryCaption}</figcaption></figure></div></section>

      <section className={styles.soft}><div className={styles.inner}><SectionTitle number="05 — USAGES OPÉRATIONNELS" title={t.usesTitle} intro={t.usesIntro} /><div className={styles.useCases}>{t.uses.map(([file,title,text],i)=><article className={styles.useCase} data-reverse={i%2===1 || undefined} key={file}><Picture file={file} alt={imageAlt(title)} /><div><p className={styles.kicker}>0{i+1}</p><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>

      <section className={styles.white}><div className={`${styles.inner} ${styles.record}`}><div><SectionTitle number="06 — CONTEXTE DOCUMENTAIRE" title={t.recordTitle} intro={t.recordText} /><ul className={styles.detailList}>{t.recordItems.map(x=><li key={x}>{x}</li>)}</ul><strong className={styles.statement}>{t.recordMessage}</strong></div><figure className={styles.productFigure}><Picture file="coro-knowledge-interface-fiche-document.webp" alt={imageAlt(t.recordTitle)} /><figcaption>{t.recordCaption}</figcaption></figure></div></section>

      <section className={styles.ai}><div className={styles.inner}><SectionTitle number="07 — KNOWLEDGE + CORO AI" title={t.aiTitle} intro={t.aiIntro} /><div className={styles.aiLayout}><Picture file="coro-knowledge-interface-assistant-ia.webp" alt={imageAlt(t.aiTitle)} /><div className={styles.aiDemo}><span>{t.demoLabel}</span><p className={styles.question}>{t.aiQuestion}</p><p>{t.aiAnswer}</p><small>{t.aiSource}</small><p className={styles.warning}>{t.aiWarning}</p></div></div><div className={styles.fourGrid}>{t.aiPrinciples.map(([title,text])=><article className={styles.lightCard} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div><Button href={localizedHref('/coro-ai',locale)}>{t.discoverAi}</Button></div></section>

      <section className={styles.white}><div className={styles.inner}><SectionTitle number="08 — ÉCOSYSTÈME CORO" title={t.ecosystemTitle} intro={t.ecosystemText} /><div className={styles.ecosystem}><div className={styles.center}><strong>CORO Knowledge</strong><span>{locale==='fr'?'Mémoire commune':'Shared memory'}</span></div>{t.ecosystem.map(([name,verb])=><div className={styles.node} key={name}><strong>{name}</strong><span>{verb}</span></div>)}</div></div></section>

      <section className={styles.soft}><div className={styles.inner}><SectionTitle number="09 — GOUVERNANCE" title={t.governanceTitle} intro={t.governanceIntro} /><div className={styles.fourGrid}>{t.governance.map(([title,text],i)=><article className={styles.lightCard} key={title}><span className={styles.cardNumber}>0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div><aside className={styles.note}>{t.governanceNote}</aside></div></section>

      <section className={styles.white}><div className={styles.inner}><SectionTitle number="10 — BÉNÉFICES" title={t.benefitsTitle} /><div className={styles.fourGrid}>{t.benefits.map(([title,text])=><article className={styles.benefit} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div><ul className={styles.audiences}>{t.audiences.map(x=><li key={x}>{x}</li>)}</ul></div></section>

      <section className={styles.white}><div className={styles.inner}><SectionTitle number="11 — FAQ" title={t.faqTitle} /><Accordion label={t.faqTitle} items={t.faq.map(([q,a],i)=>({id:`knowledge-faq-${i}`,question:q,answer:a}))} /></div></section>
    </div>
    <CTASection id="knowledge-cta" tone="dark" label="CORO Knowledge" statement={t.ctaTitle} support={t.ctaText} primary={{label:t.demo,href:localizedHref('/#demo',locale)}} secondary={{label:t.discoverPlatform,href:localizedHref('/',locale)}} />
  </V2Shell>;
}
