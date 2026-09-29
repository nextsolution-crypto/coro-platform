import { ActionItem, ActionList } from '@/components/operational/ActionItem';
import { DocumentList, DocumentStatus } from '@/components/operational/DocumentStatus';
import { MetricTile } from '@/components/operational/MetricTile';
import { OperationalPanel, PanelSection } from '@/components/operational/OperationalPanel';
import { OperationalRail, RailCell } from '@/components/operational/OperationalRail';
import { OperationalScene } from '@/components/operational/OperationalScene';
import { PeopleStatus } from '@/components/operational/PeopleStatus';
import { StatusChip } from '@/components/operational/StatusChip';
import { Timeline, TimelineEvent } from '@/components/operational/Timeline';
import type { OpsState, OpsTone } from '@/components/operational/types';
import { Container } from '@/components/ui/Container';
import { localizedHref, type Locale } from '@/lib/site/locale';
import { opsAsset, opsCopy, opsViewKeys, type OpsViewKey } from './operational-data';
import styles from './design-lab.module.css';

export { opsViewKeys };
export type { OpsViewKey };

const SIZES = '(min-width: 68rem) 58vw, 100vw';

function Band({ id, tone, children }: { id?: string; tone: 'white' | 'soft' | 'dark'; children: React.ReactNode }) {
  return <div id={id} className={styles.opsBand} data-ops-band={tone} data-surface={tone === 'dark' ? 'dark' : undefined}><Container>{children}</Container></div>;
}

function StudyHead({ name, href, open }: { name: string; href?: string; open: string }) {
  return <div className={styles.studyBar} data-surface="dark"><Container><span className={styles.label}>{name}</span>{href && <> <a href={href} className={styles.label}>{open}</a></>}</Container></div>;
}

/* ── A: calm / normal. Lowest UI presence: the media leads, a quiet rail follows. NORMAL on navy. ── */
function StudyA({ locale }: { locale: Locale }) {
  const t = opsCopy[locale]; const c = t.common; const a = t.a; const tone: OpsTone = 'dark';
  return (
    <Band id="operational-a" tone="dark">
      <OperationalScene layout="lead" src={opsAsset.lobby.src} ratio={opsAsset.lobby.ratio} alt={a.alt} position="40% 55%" mobilePosition="38% 50%" first="media" sizes="(min-width: 68rem) 1200px, 100vw">
        <OperationalRail label={c.panelLabel} tone={tone}>
          <RailCell>
            <StatusChip state="normal" label={a.status} srPrefix={t.zone.srState} tone={tone} />
            <p className={styles.opsSituation}>{a.situation}</p>
          </RailCell>
          <RailCell><p className={styles.opsSupport}>{a.support}</p></RailCell>
          <RailCell><MetricTile value={a.metric[0]} label={a.metric[1]} demo={t.zone.demoTag} tone={tone} /></RailCell>
          <RailCell>
            <DocumentList label={c.docs} tone={tone}><DocumentStatus code={a.doc[0]} title={a.doc[1]} state="complete" stateLabel={a.doc[2]} /></DocumentList>
          </RailCell>
        </OperationalRail>
      </OperationalScene>
    </Band>
  );
}

/* ── B: active incident. CRITICAL on white. Two metrics, a short log, one next action. ── */
function StudyB({ locale }: { locale: Locale }) {
  const t = opsCopy[locale]; const c = t.common; const b = t.b;
  return (
    <Band id="operational-b" tone="white">
      <OperationalScene src={opsAsset.command.src} ratio={opsAsset.command.ratio} alt={b.alt} position="50% 40%" mobilePosition="50% 35%" first="panel" sizes={SIZES}>
        <OperationalPanel label={c.panelLabel} context={b.context} demo={t.zone.demoTag} status={<StatusChip state="critical" label={b.status} srPrefix={t.zone.srState} />}>
          <PanelSection>
            <p className={styles.opsSituation}>{b.situation}</p>
            <p className={styles.opsSupport}>{b.support}</p>
          </PanelSection>
          <PanelSection label={c.metrics}>
            <div className={styles.opsMetrics}>{b.metrics.map(([value, label, dt]) => <MetricTile key={label} value={value} label={label} demo={t.zone.demoTag} dateTime={dt} />)}</div>
          </PanelSection>
          <PanelSection label={c.timeline}>
            <Timeline label={c.timeline}>{b.events.map(([time, event, state, stateLabel, source], i) => <TimelineEvent key={time} time={time} dateTime={time} event={event} state={state as OpsState | undefined} stateLabel={stateLabel} source={source} index={i} />)}</Timeline>
          </PanelSection>
          <PanelSection label={c.actions}>
            <ActionList label={c.actions}><ActionItem priority={1} priorityLabel={c.priority} action={b.action[0]} owner={b.action[1]} status="doing" statusLabel={c.doing} /></ActionList>
          </PanelSection>
        </OperationalPanel>
      </OperationalScene>
    </Band>
  );
}

/* ── C: people / evacuation. Light plate on the soft surface; the people are the subject. ── */
function StudyC({ locale }: { locale: Locale }) {
  const t = opsCopy[locale]; const c = t.common; const p = t.c;
  return (
    <Band id="operational-c" tone="soft">
      <OperationalScene layout="people" src={opsAsset.assembly.src} ratio={opsAsset.assembly.ratio} alt={p.alt} position="45% 60%" mobilePosition="45% 60%" first="media" sizes={SIZES}>
        <OperationalPanel label={c.panelLabel} context={p.context} demo={t.zone.demoTag} status={<StatusChip state="info" label={p.phase} srPrefix={t.zone.srState} />}>
          <PanelSection label={c.people}>
            <PeopleStatus label={c.people} groups={p.people.map(([key, label, value, state]) => ({ key, label, value, state }))} />
            <p className={styles.opsSupport}>{p.phaseNote} · {t.zone.demoTag}</p>
          </PanelSection>
          <PanelSection label={c.actions}>
            <ActionList label={c.actions}>{p.actions.map(([action, owner, status], i) => <ActionItem key={action} priority={i + 1} priorityLabel={c.priority} action={action} owner={owner} status={status} statusLabel={status === 'doing' ? c.doing : c.todo} />)}</ActionList>
          </PanelSection>
        </OperationalPanel>
      </OperationalScene>
    </Band>
  );
}

/* ── D: recovery / REX. The interface relaxes: no plate. A statement, then an open row of milestones, proof and learning. ── */
function StudyD({ locale }: { locale: Locale }) {
  const t = opsCopy[locale]; const c = t.common; const d = t.d;
  const flow = (
    <div className={styles.recFlow}>
      <section className={styles.recCol} aria-label={d.milestones}>
        <p className={styles.label}>{d.milestones}</p>
        <Timeline label={c.timeline}>{d.events.map(([time, event, state, stateLabel], i) => <TimelineEvent key={time} time={time} dateTime={time} event={event} state={state as OpsState} stateLabel={stateLabel} index={i} />)}</Timeline>
      </section>
      <section className={`${styles.recCol} ${styles.recEvidence}`} data-ops-tone="dark" aria-label={d.docLabel}>
        <p className={styles.label}>{d.docLabel}</p>
        <DocumentList label={c.docs} tone="dark"><DocumentStatus code={d.doc[0]} title={d.doc[1]} state={d.doc[2]} stateLabel={d.doc[3]} /></DocumentList>
      </section>
      <section className={styles.recCol} aria-label={d.next}>
        <p className={styles.label}>{d.next}</p>
        <ActionList label={c.actions}><ActionItem priority={2} priorityLabel={c.priority} action={d.action[0]} owner={d.action[1]} status="todo" statusLabel={c.todo} /></ActionList>
      </section>
    </div>
  );
  return (
    <Band id="operational-d" tone="white">
      <OperationalScene layout="open" src={opsAsset.recovery.src} ratio={opsAsset.recovery.ratio} alt={d.alt} position="30% 40%" mobilePosition="25% 40%" first="media" note={d.note} below={flow} sizes={SIZES}>
        <section className={styles.recStatement} aria-label={c.panelLabel}>
          <p className={styles.label}>{d.context} <span className={styles.opsDemo}>{t.zone.demoTag}</span></p>
          <StatusChip state="complete" label={d.status} srPrefix={t.zone.srState} />
          <p className={styles.recHeadline}>{d.situation}</p>
          <p className={styles.opsSupport}>{d.support}</p>
        </section>
      </OperationalScene>
    </Band>
  );
}

function Vocabulary({ locale }: { locale: Locale }) {
  const t = opsCopy[locale].zone;
  return (
    <div className={styles.opsVocab}>
      {t.surfaces.map(([surfaceName, tone]) => (
        <div key={tone} className={styles.opsVocabRow} data-ops-band={tone} data-surface={tone === 'dark' ? 'dark' : undefined}>
          <p className={styles.label}>{surfaceName}</p>
          <ul>{t.stateList.map(([state, label]) => <li key={state}><StatusChip state={state} label={label} srPrefix={t.srState} tone={tone === 'dark' ? 'dark' : 'light'} /></li>)}</ul>
        </div>
      ))}
    </div>
  );
}

function Primitives({ locale }: { locale: Locale }) {
  const t = opsCopy[locale]; const c = t.common; const d = t.d; const b = t.b; const p = t.c;
  return (
    <ol className={styles.opsPrims}>
      {t.zone.primitiveRows.map(([name, role]) => (
        <li key={name}>
          <div><p className={styles.label}>{name}</p><p className={styles.opsSupport}>{role}</p></div>
          <div className={styles.opsPrimDemo}>
            {name === 'StatusChip' && <StatusChip state="attention" label={t.zone.stateList[2][1]} srPrefix={t.zone.srState} />}
            {name === 'OperationalPanel' && <span className={styles.opsSupport}>{c.panelLabel}</span>}
            {name === 'MetricTile' && <MetricTile value="128" label={t.a.metric[1]} demo={t.zone.demoTag} />}
            {name === 'Timeline' && <Timeline label={c.timeline}>{b.events.slice(0, 2).map(([time, event, state, stateLabel, source], i) => <TimelineEvent key={time} time={time} dateTime={time} event={event} state={state as OpsState | undefined} stateLabel={stateLabel} source={source} index={i} />)}</Timeline>}
            {name === 'PeopleStatus' && <PeopleStatus label={c.people} groups={p.people.map(([key, label, value, state]) => ({ key, label, value, state }))} />}
            {name === 'ActionItem' && <ActionList label={c.actions}><ActionItem priority={1} priorityLabel={c.priority} action={b.action[0]} owner={b.action[1]} status="doing" statusLabel={c.doing} /></ActionList>}
            {name === 'DocumentStatus' && <DocumentList label={c.docs}><DocumentStatus code={d.doc[0]} title={d.doc[1]} state={d.doc[2]} stateLabel={d.doc[3]} /></DocumentList>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Zone 05: principles, state vocabulary, primitives, then four studies. */
export function OperationalZone({ locale }: { locale: Locale }) {
  const t = opsCopy[locale];
  const view = (key: OpsViewKey) => `${localizedHref('/design-lab', locale)}${locale === 'en' ? '&' : '?'}view=${key}`;
  return (
    <section id="operational" className={styles.zone} aria-labelledby="operational-title">
      <Container><header className={styles.zoneHead}><span>05</span><h2 id="operational-title">{t.zone.title}</h2></header></Container>
      <div className={styles.band} data-tone="white"><Container>
        <div className={styles.block}>
          <ul className={styles.opsPrinciples}>{t.zone.principles.map((line) => <li key={line}>{line}</li>)}</ul>
          <p className={styles.blockLead}>{t.zone.lead}</p>
          <p className={styles.note}>{t.zone.demo}</p>
        </div>
        <div className={styles.block}><h3>{t.zone.states}</h3><p className={styles.blockLead}>{t.zone.statesLead}</p><Vocabulary locale={locale} /></div>
        <div className={styles.block}><h3>{t.zone.primitives}</h3><p className={styles.blockLead}>{t.zone.primitivesLead}</p><Primitives locale={locale} /></div>
      </Container></div>
      <StudyHead name={`${t.a.name}`} href={view('operational-a')} open={t.zone.open} /><StudyA locale={locale} />
      <StudyHead name={`${t.b.name}`} href={view('operational-b')} open={t.zone.open} /><StudyB locale={locale} />
      <StudyHead name={`${t.c.name}`} href={view('operational-c')} open={t.zone.open} /><StudyC locale={locale} />
      <StudyHead name={`${t.d.name}`} href={view('operational-d')} open={t.zone.open} /><StudyD locale={locale} />
    </section>
  );
}

/** Chromeless view for responsive QA. */
export function OperationalView({ locale, study }: { locale: Locale; study: 'a' | 'b' | 'c' | 'd' }) {
  const Study = { a: StudyA, b: StudyB, c: StudyC, d: StudyD }[study];
  return <div data-design-lab data-coro-system="v1" className={styles.lab}><main id="lab-main"><Study locale={locale} /></main></div>;
}
