import { HeroArchitectural } from '@/components/hero/HeroArchitectural';
import { HeroOperational } from '@/components/hero/HeroOperational';
import { HeroSignature } from '@/components/hero/HeroSignature';
import { HeroTechnical } from '@/components/hero/HeroTechnical';
import { SiteHeader, type SiteHeaderTone } from '@/components/site/SiteHeader';
import { Container } from '@/components/ui/Container';
import type { Locale } from '@/lib/site/locale';
import { heroStudies } from './heroes-data';
import styles from './design-lab.module.css';

type Notes = { family: string; principle: string; mobile: string };

function StudyNotes({ notes, labels }: { notes: Notes; labels: { family: string; principle: string; mobile: string } }) {
  return (
    <div className={styles.notes}>
      <Container>
        <dl>
          <div><dt className={styles.label}>{labels.family}</dt><dd>{notes.family}</dd></div>
          <div><dt className={styles.label}>{labels.principle}</dt><dd>{notes.principle}</dd></div>
          <div><dt className={styles.label}>{labels.mobile}</dt><dd>{notes.mobile}</dd></div>
        </dl>
      </Container>
    </div>
  );
}

function StudyBar({ name, demo }: { name: string; demo: string }) {
  return <div className={styles.studyBar} data-surface="dark"><Container><span className={styles.label}>{name}</span><span className={styles.label}>{demo}</span></Container></div>;
}

/** Zone 02 of the Design Lab: three hero studies. Header contexts use the approved SiteHeader tones only. */
export function HeroSystemZone({ locale }: { locale: Locale }) {
  const t = heroStudies[locale];
  const header = (tone: SiteHeaderTone) => <SiteHeader locale={locale} pathname="/design-lab" tone={tone} />;
  return (
    <section id="heroes" className={styles.zone} aria-labelledby="heroes-title">
      <Container><header className={styles.zoneHead}><span>02</span><h2 id="heroes-title">{t.zone.title}</h2></header></Container>
      <div className={styles.band} data-tone="white"><Container><div className={styles.block}><p className={styles.blockLead}>{t.zone.lead}</p></div></Container></div>

      <div className={styles.study} id="hero-a">
        <StudyBar name={t.a.name} demo={t.zone.stress} />
        {header('light')}
        <HeroArchitectural heading="h3" copy={t.a.copy} mediaAlt={t.a.mediaAlt} caption={t.a.caption} annotations={t.a.annotations} annotationsLabel={t.a.annotationsLabel} />
        <StudyNotes notes={t.a.notes} labels={t.zone.noteLabels} />
      </div>


      <div className={styles.study} id="hero-a2">
        <StudyBar name={`${t.a2.name} · ${t.zone.headerModes.separate}`} demo={t.zone.stress} />
        {header('light')}
        <HeroSignature heading="h3" headerMode="separate" copy={t.a2.copy} mediaAlt={t.a2.mediaAlt} caption={t.a2.caption} datum={t.a2.datum} annotations={t.a2.annotations} annotationsLabel={t.a2.annotationsLabel} />
        <StudyNotes notes={t.a2.notes} labels={t.zone.noteLabels} />
      </div>

      <div className={styles.study} id="hero-a2i">
        <StudyBar name={`${t.a2.name} · ${t.zone.headerModes.integrated}`} demo={t.zone.stress} />
        
        <HeroSignature heading="h3" headerMode="integrated" header={header('light')} copy={t.a2.copy} mediaAlt={t.a2.mediaAlt} caption={t.a2.caption} datum={t.a2.datum} annotations={t.a2.annotations} annotationsLabel={t.a2.annotationsLabel} />
        <StudyNotes notes={t.a2.notes} labels={t.zone.noteLabels} />
      </div>

      <div className={styles.study} id="hero-b">
        <StudyBar name={t.b.name} demo={t.zone.stress} />
        {header('dark')}
        <HeroOperational heading="h3" copy={t.b.copy} mediaAlt={t.b.mediaAlt} panel={t.b.panel} />
        <StudyNotes notes={t.b.notes} labels={t.zone.noteLabels} />
      </div>

      <div className={styles.study} id="hero-c">
        <StudyBar name={t.c.name} demo={t.zone.stress} />
        {header('light')}
        <HeroTechnical heading="h3" copy={t.c.copy} mediaAlt={t.c.mediaAlt} references={t.c.references} referencesLabel={t.c.referencesLabel} titleBlock={t.c.titleBlock} inset={t.c.inset} />
        <StudyNotes notes={t.c.notes} labels={t.zone.noteLabels} />
      </div>
    </section>
  );
}

/** Chromeless single-study view (?view=hero-a|hero-b|hero-c): real viewport width for responsive QA, one study per document. */
export type HeroStudyKey = 'a' | 'a2' | 'a2i' | 'b' | 'c';
export const heroStudyKeys: readonly HeroStudyKey[] = ['a', 'a2', 'a2i', 'b', 'c'];

export function HeroStudyView({ locale, study }: { locale: Locale; study: HeroStudyKey }) {
  const t = heroStudies[locale];
  const tone: SiteHeaderTone = study === 'b' ? 'dark' : 'light';
  const integrated = study === 'a2i';
  const headerNode = <SiteHeader locale={locale} pathname={`/design-lab?view=hero-${study}`} tone={tone} />;
  return (
    <div data-design-lab data-coro-system="v1" className={styles.stage}>
      {!integrated && headerNode}
      <main id="lab-main">
        {(study === 'a2' || study === 'a2i') && <HeroSignature heading="h1" headerMode={integrated ? 'integrated' : 'separate'} header={integrated ? headerNode : undefined} copy={t.a2.copy} mediaAlt={t.a2.mediaAlt} caption={t.a2.caption} datum={t.a2.datum} annotations={t.a2.annotations} annotationsLabel={t.a2.annotationsLabel} />}
        {study === 'a' && <HeroArchitectural heading="h1" copy={t.a.copy} mediaAlt={t.a.mediaAlt} caption={t.a.caption} annotations={t.a.annotations} annotationsLabel={t.a.annotationsLabel} />}
        {study === 'b' && <HeroOperational heading="h1" copy={t.b.copy} mediaAlt={t.b.mediaAlt} panel={t.b.panel} />}
        {study === 'c' && <HeroTechnical heading="h1" copy={t.c.copy} mediaAlt={t.c.mediaAlt} references={t.c.references} referencesLabel={t.c.referencesLabel} titleBlock={t.c.titleBlock} inset={t.c.inset} />}
      </main>
    </div>
  );
}
