import type { Locale } from '@/lib/site/locale';
import { diagnosticQuestions } from '@/lib/diagnostic/config';
import { buildResiliencePortraitGeometry, PORTRAIT_CENTER, PORTRAIT_VIEWBOX_SIZE } from '@/lib/diagnostic/portrait';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId } from '@/lib/diagnostic/types';
import styles from './ResiliencePortrait.module.css';

const copy = {
  fr: {
    title: 'Portrait de résilience CORO', description: 'Lecture graphique des huit dimensions à partir de vos réponses. L’échelle va de capacité absente ou insuffisante à pratique structurée.',
    legend: 'Légende', levels: ['C · À renforcer', 'B · Partiel', 'A · Structuré'], unknown: 'D · Information inconnue', notApplicable: 'E · Non applicable', alternative: 'La couverture numérique est insuffisante pour former une surface radar interprétable. La liste structurée ci-dessous demeure la référence.', tableDimension: 'Dimension', tableResponse: 'Réponse', tableReading: 'Lecture', evaluated: 'Valeur évaluée', noNumeric: 'Aucune valeur numérique artificielle',
  },
  en: {
    title: 'CORO Resilience Portrait', description: 'A graphical review of the eight dimensions based on your answers. The scale ranges from absent or insufficient capability to structured practice.',
    legend: 'Legend', levels: ['C · Needs reinforcement', 'B · Partial', 'A · Structured'], unknown: 'D · Unknown information', notApplicable: 'E · Not applicable', alternative: 'There is insufficient numeric coverage to form an interpretable radar surface. The structured list below remains the reference.', tableDimension: 'Dimension', tableResponse: 'Answer', tableReading: 'Reading', evaluated: 'Evaluated value', noNumeric: 'No artificial numeric value',
  },
} as const;

const reading = (answer: DiagnosticAnswerId, locale: Locale) => answer === 'D' ? copy[locale].unknown : answer === 'E' ? copy[locale].notApplicable : `${copy[locale].evaluated}: ${answer === 'A' ? '3 / 3' : answer === 'B' ? '2 / 3' : '0 / 3'}`;

export function ResiliencePortrait({ responses, locale }: { responses: CompleteDiagnosticResponses; locale: Locale }) {
  const t = copy[locale];
  const geometry = buildResiliencePortraitGeometry(responses);
  const titleId = `portrait-title-${locale}`;
  const descriptionId = `portrait-description-${locale}`;
  return <section className={styles.section} aria-labelledby={titleId}>
    <div className={styles.heading}><div><p className={styles.eyebrow}>DX · 8 dimensions</p><h2 id={titleId}>{t.title}</h2><p id={descriptionId}>{t.description}</p></div></div>
    {geometry.usesAlternative ? <p className={styles.alternative} role="note">{t.alternative}</p> : <div className={styles.visual}>
      <svg className={styles.radar} viewBox={`0 0 ${PORTRAIT_VIEWBOX_SIZE} ${PORTRAIT_VIEWBOX_SIZE}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <g className={styles.grid}>{geometry.gridPolygons.map((polygon, index) => <polygon key={polygon} points={polygon} data-level={index + 1} />)}{geometry.points.map((point) => <line key={point.dimensionId} x1={PORTRAIT_CENTER} y1={PORTRAIT_CENTER} x2={point.axisX} y2={point.axisY} />)}</g>
        {geometry.closedPolygon && <polygon className={styles.surface} points={geometry.closedPolygon} />}
        {geometry.openSegments.map((segment) => <polyline className={styles.segment} key={segment} points={segment} />)}
        <g className={styles.markers}>{geometry.points.map((point) => point.value !== null
          ? <circle key={point.dimensionId} cx={point.x} cy={point.y} r="8" data-answer={point.answerId} />
          : point.answerId === 'D'
            ? <rect key={point.dimensionId} x={point.axisX - 8} y={point.axisY - 8} width="16" height="16" rx="2" transform={`rotate(45 ${point.axisX} ${point.axisY})`} data-answer="D" />
            : <g key={point.dimensionId} data-answer="E"><line x1={point.axisX - 8} y1={point.axisY - 8} x2={point.axisX + 8} y2={point.axisY + 8} /><line x1={point.axisX + 8} y1={point.axisY - 8} x2={point.axisX - 8} y2={point.axisY + 8} /></g>)}</g>
        <g className={styles.axisLabels}>{geometry.points.map((point) => <text key={point.dimensionId} x={point.axisX} y={point.axisY} dx={point.axisX < PORTRAIT_CENTER ? -16 : point.axisX > PORTRAIT_CENTER ? 16 : 0} dy={point.axisY < PORTRAIT_CENTER ? -16 : point.axisY > PORTRAIT_CENTER ? 28 : 5} textAnchor={point.axisX < PORTRAIT_CENTER ? 'end' : point.axisX > PORTRAIT_CENTER ? 'start' : 'middle'}>{point.dimensionId}</text>)}</g>
      </svg>
      <div className={styles.legend}><h3>{t.legend}</h3><ul><li><span className={styles.swatchSurface} />{t.levels.join(' · ')}</li><li><span className={styles.swatchUnknown} />{t.unknown}</li><li><span className={styles.swatchNa} />{t.notApplicable}</li></ul></div>
    </div>}
    <div className={styles.tableWrap}><table><thead><tr><th>{t.tableDimension}</th><th>{t.tableResponse}</th><th>{t.tableReading}</th></tr></thead><tbody>{diagnosticQuestions.map((question) => { const answer = responses[question.id]; return <tr key={question.id}><th scope="row"><span>{question.id}</span>{question.dimension[locale]}</th><td>{answer}</td><td>{reading(answer, locale)}</td></tr>; })}</tbody></table></div>
  </section>;
}
