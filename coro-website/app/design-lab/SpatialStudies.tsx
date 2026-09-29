import { BlueprintFrame, BuildingFrame, MapFrame } from '@/components/spatial/SpatialFrames';
import { Container } from '@/components/ui/Container';
import { localizedHref, type Locale } from '@/lib/site/locale';
import { spatialAsset, spatialCopy, spatialItems } from './spatial-data';
import styles from './design-lab.module.css';

export const spatialViewKeys = ['spatial'] as const;

function StudyHead({ name, href, open }: { name: string; href: string; open: string }) {
  return <div className={styles.studyBar} data-surface="dark"><Container><span className={styles.label}>{name}</span> <a href={href} className={styles.label}>{open}</a></Container></div>;
}

function Studies({ locale }: { locale: Locale }) {
  const t = spatialCopy[locale];
  const legend = (
    <div className={styles.spatialLegend}>
      <p className={styles.label}>{t.d.legend}</p>
      <ul>{t.d.legendItems.map(([code, text]) => <li key={code}><span data-hatch={code} aria-hidden="true" /><b>{code}</b> {text}</li>)}</ul>
      <p className={styles.note}>{t.d.note}</p>
    </div>
  );
  return (
    <>
      <div className={styles.band} data-tone="white" id="spatial-a"><Container>
        <div className={styles.spatialStudy}>
          <BuildingFrame src={spatialAsset.cutaway.src} ratio={spatialAsset.cutaway.ratio} alt={t.a.alt} slice={[6, 94]} mobileSlice={[24, 76]} sizes="(min-width: 68rem) 1100px, 100vw" items={spatialItems(locale, 'a')} indexLabel={t.a.index} reference={t.a.ref} cartouche={t.a.cart} />
        </div>
      </Container></div>
      <div className={styles.band} data-tone="paper" id="spatial-b"><Container>
        <div className={styles.spatialStudy}>
          <BlueprintFrame src={spatialAsset.plan.src} ratio={spatialAsset.plan.ratio} alt={t.b.alt} sizes="(min-width: 68rem) 1100px, 100vw" items={spatialItems(locale, 'b')} indexLabel={t.b.index} reference={t.b.ref} cartouche={t.b.cart} />
        </div>
      </Container></div>
      <div className={styles.band} data-tone="white" id="spatial-c"><Container>
        <div className={styles.spatialStudy}>
          <BuildingFrame src={spatialAsset.entry.src} ratio={spatialAsset.entry.ratio} alt={t.c.alt} slice={[0, 100]} mobileSlice={[20, 66]} sizes="(min-width: 68rem) 1100px, 100vw" items={spatialItems(locale, 'c')} indexLabel={t.c.index} reference={t.c.ref} cartouche={t.c.cart} />
        </div>
      </Container></div>
      <div className={styles.band} data-tone="paper" id="spatial-d"><Container>
        <div className={styles.spatialStudy}>
          <MapFrame src={spatialAsset.map.src} ratio={spatialAsset.map.ratio} alt={t.d.alt} slice={[0, 75]} mobileSlice={[8, 68]} sizes="(min-width: 68rem) 1100px, 100vw" items={spatialItems(locale, 'd')} indexLabel={t.d.index} reference={t.d.ref} cartouche={t.d.cart} legend={legend} />
        </div>
      </Container></div>
    </>
  );
}

/** Zone 04: scale concept, then four studies (building section, blueprint, zones, territory). */
export function SpatialZone({ locale }: { locale: Locale }) {
  const t = spatialCopy[locale];
  const href = `${localizedHref('/design-lab', locale)}${locale === 'en' ? '&' : '?'}view=spatial`;
  return (
    <section id="spatial" className={styles.zone} aria-labelledby="spatial-title">
      <Container><header className={styles.zoneHead}><span>04</span><h2 id="spatial-title">{t.zone.title}</h2></header></Container>
      <div className={styles.band} data-tone="white"><Container>
        <div className={styles.block}><p className={styles.blockLead}>{t.zone.lead}</p><p className={styles.note}>{t.zone.rule}</p><p className={styles.note}>{t.zone.demo}</p></div>
        <div className={styles.block}>
          <h3>{t.zone.scaleTitle}</h3>
          <ol className={styles.depth}>{t.zone.scale.map(([name, text], i) => <li key={name}><span className={styles.label}>{String(i + 1).padStart(2, '0')}</span><b>{name}</b><small>{text}</small></li>)}</ol>
        </div>
        <p><a href={href} className={styles.label}>{t.zone.open}</a></p>
      </Container></div>
      <StudyHead name={`${t.zone.studies} ${t.a.name}`} href={href} open={t.zone.open} />
      <Studies locale={locale} />
    </section>
  );
}

/** Chromeless view for responsive QA. */
export function SpatialView({ locale }: { locale: Locale }) {
  return <div data-design-lab data-coro-system="v1" className={styles.lab}><main id="lab-main"><Studies locale={locale} /></main></div>;
}
