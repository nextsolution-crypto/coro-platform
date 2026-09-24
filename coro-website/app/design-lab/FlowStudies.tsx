import Image from 'next/image';
import { Continuum } from '@/components/flow/Continuum';
import { DataToActionFlow } from '@/components/flow/DataToActionFlow';
import { ProcessFlow } from '@/components/flow/ProcessFlow';
import { ScenarioFlow } from '@/components/flow/ScenarioFlow';
import { Container } from '@/components/ui/Container';
import { localizedHref, type Locale } from '@/lib/site/locale';
import { flowAsset, flowCopy, flowViewKeys, type FlowViewKey } from './flow-data';
import styles from './design-lab.module.css';

export { flowViewKeys };
export type { FlowViewKey };

type Tone = 'white' | 'soft' | 'dark';

function Band({ id, tone, children }: { id?: string; tone: Tone; children: React.ReactNode }) {
  return <div id={id} className={styles.opsBand} data-ops-band={tone} data-surface={tone === 'dark' ? 'dark' : undefined}><Container>{children}</Container></div>;
}

function StudyHead({ name, href, open }: { name: string; href?: string; open: string }) {
  return <div className={styles.studyBar} data-surface="dark"><Container><span className={styles.label}>{name}</span>{href && <> <a href={href} className={styles.label}>{open}</a></>}</Container></div>;
}

function Lead({ text }: { text: string }) {
  return <p className={styles.flowLead}>{text}</p>;
}

/* ── A: the flagship. Nine stages, four movements, one line, one return. ── */
function StudyA({ locale }: { locale: Locale }) {
  const t = flowCopy[locale];
  return (
    <Band id="flow-a" tone="white">
      <Lead text={t.zone.leads.a} />
      <Continuum label={t.continuum.label} phases={t.continuum.phases} movements={t.continuum.movements} feedback={t.continuum.feedback} />
    </Band>
  );
}

/* ── B: the mechanism, in four beats, on deep navy. ── */
function StudyB({ locale }: { locale: Locale }) {
  const t = flowCopy[locale];
  return (
    <Band id="flow-b" tone="dark">
      <Lead text={t.zone.leads.b} />
      <DataToActionFlow label={t.d2a.label} steps={t.d2a.steps} returnNote={t.d2a.returnNote} />
    </Band>
  );
}

/* ── C: a bounded process, timed, with a decision gate, on the soft surface. ── */
function StudyC({ locale }: { locale: Locale }) {
  const t = flowCopy[locale];
  return (
    <Band id="flow-c" tone="soft">
      <Lead text={t.zone.leads.c} />
      <ProcessFlow label={t.process.label} steps={t.process.steps} demo={t.process.demo} gateLabel={t.process.gate} outputLabel={t.process.output} />
    </Band>
  );
}

/* ── D: a real situation, its decision, and the learning that follows. Bridges LAB-05 and LAB-06. ── */
function StudyD({ locale }: { locale: Locale }) {
  const t = flowCopy[locale]; const s = t.scenario;
  const after = (
    <div className={styles.scenarioAfter}>
      <p className={styles.label}>{s.afterLabel}</p>
      <ol>{s.after.map(([n, word, text]) => <li key={n}><span className={styles.label}>{n} · {word}</span><span>{text}</span></li>)}</ol>
      <p className={styles.opsSupport}>{s.returnNote}</p>
    </div>
  );
  return (
    <Band id="flow-d" tone="white">
      <Lead text={t.zone.leads.d} />
      <div className={styles.scenarioLayout}>
        <div className={styles.scenarioMedia}><Image src={flowAsset.command.src} alt={s.alt} fill sizes="(min-width: 68rem) 55vw, 100vw" style={{ objectFit: 'cover', objectPosition: '50% 40%' }} /></div>
        <ScenarioFlow label={s.label} steps={s.steps} demo={s.demo} after={after} />
      </div>
    </Band>
  );
}

function Primitives({ locale }: { locale: Locale }) {
  const t = flowCopy[locale].zone;
  return (
    <>
      <ol className={styles.opsPrims}>{t.primitives.map(([name, role]) => <li key={name}><p className={styles.label}>{name}</p><p className={styles.opsSupport}>{role}</p></li>)}</ol>
      <p className={styles.note}>{t.noConnector}</p>
    </>
  );
}

/** Zone 06: principles, primitives, then four studies. */
export function FlowZone({ locale }: { locale: Locale }) {
  const t = flowCopy[locale];
  const view = (key: FlowViewKey) => `${localizedHref('/design-lab', locale)}${locale === 'en' ? '&' : '?'}view=${key}`;
  return (
    <section id="flows" className={styles.zone} aria-labelledby="flows-title">
      <Container><header className={styles.zoneHead}><span>06</span><h2 id="flows-title">{t.zone.title}</h2></header></Container>
      <div className={styles.band} data-tone="white"><Container>
        <div className={styles.block}>
          <ul className={styles.opsPrinciples}>{t.zone.principles.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className={styles.blockLead}>{t.zone.lead}</p>
          <p className={styles.note}>{t.zone.demo}</p>
        </div>
        <div className={styles.block}><h3>{t.zone.primitivesTitle}</h3><Primitives locale={locale} /></div>
      </Container></div>
      <StudyHead name={t.zone.studies.a} href={view('flow-a')} open={t.zone.open} /><StudyA locale={locale} />
      <StudyHead name={t.zone.studies.b} href={view('flow-b')} open={t.zone.open} /><StudyB locale={locale} />
      <StudyHead name={t.zone.studies.c} href={view('flow-c')} open={t.zone.open} /><StudyC locale={locale} />
      <StudyHead name={t.zone.studies.d} href={view('flow-d')} open={t.zone.open} /><StudyD locale={locale} />
    </section>
  );
}

/** Chromeless view for responsive QA. */
export function FlowView({ locale, study }: { locale: Locale; study: 'a' | 'b' | 'c' | 'd' }) {
  const Study = { a: StudyA, b: StudyB, c: StudyC, d: StudyD }[study];
  return <div data-design-lab data-coro-system="v1" className={styles.lab}><main id="lab-main"><Study locale={locale} /></main></div>;
}
