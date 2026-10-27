'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, type RefObject, type ReactNode } from 'react';
import DemoForm from '@/app/DemoForm';
import type { Locale } from '@/lib/site/locale';
import { DIAGNOSTIC_QUESTION_COUNT, DIAGNOSTIC_STORAGE_KEY, diagnosticQuestions } from '@/lib/diagnostic/config';
import { buildDiagnosticResult, diagnosticDimensionLabel, diagnosticLevelLabel, diagnosticSummary } from '@/lib/diagnostic/results';
import { buildDiagnosticCommercialSummary } from '@/lib/diagnostic/commercial';
import { parseDiagnosticState } from '@/lib/diagnostic/storage';
import type { CompleteDiagnosticResponses, DiagnosticAnswerId, DiagnosticResponses } from '@/lib/diagnostic/types';
import { ResiliencePortrait } from './ResiliencePortrait';
import styles from './diagnostic.module.css';

const ui = {
  fr: {
    eyebrow: 'CORO · Diagnostic express', title: 'Votre organisation est-elle réellement prête ?', lead: 'Évaluez votre préparation opérationnelle en huit questions. Cette première lecture indicative vous aidera à structurer les prochaines étapes.',
    facts: ['8 questions', 'Environ 2 minutes', 'Gratuit', 'Sans inscription'], start: 'Commencer le diagnostic', privacy: 'Vos réponses restent dans cet onglet et ne sont pas transmises à CORO.',
    progress: 'Progression', previous: 'Précédent', next: 'Suivant', finish: 'Terminer', choose: 'Sélectionnez une réponse pour continuer.', answered: 'questions répondues',
    resultEyebrow: 'Votre résultat indicatif', score: 'Score', partialScore: 'Score partiel', coverage: 'Couverture', level: 'Niveau de préparation', provisional: 'Résultat provisoire — Informations insuffisantes pour attribuer un niveau de préparation.',
    dimensions: 'Lecture des huit dimensions', strengths: 'Forces identifiées', noStrength: 'Aucune force ne peut être déduite des réponses favorables.', improvements: "Priorités d'amélioration", noImprovement: 'Aucune priorité corrective ne ressort des réponses déclarées.', verification: 'Priorités de vérification', noVerification: 'Aucune information inconnue à vérifier.',
    recommendations: 'Recommandations détaillées', practice: 'Bonne pratique', action: 'Action concrète', issue: 'Enjeu opérationnel', modules: 'Capacités CORO pertinentes', plan: "Plan d'amélioration", days: 'jours', limits: 'Limites méthodologiques',
    methodology: "Ce diagnostic est indicatif. Il repose uniquement sur vos réponses, n'est pas l'Indice CORO officiel et ne remplace ni un audit ni une validation terrain.", criticalNa: 'Une ou plusieurs dimensions fondamentales ont été déclarées non applicables; cette conclusion devrait être validée.',
    availability: 'Disponibilité', discover: 'En savoir plus', reset: 'Recommencer', privacyResult: "Vos réponses sont restées dans cet onglet et n'ont pas été transmises à CORO.", temporaryResult: "Votre résultat est temporaire et ne sera pas conservé après la fermeture ou l'actualisation de cette page.", switchResultLanguage: 'View result in English',
    heroImageAlt: "Immeuble de bureaux illuminé représentant une organisation prête à agir.", conclusionTitle: "Votre diagnostic est une première étape. Votre résilience se construit dans l'action.", conclusionText: "Transformez cette première lecture en priorités concrètes, puis validez-les avec vos équipes et sur le terrain.", conclusionImageAlt: "Coupe d'un bâtiment illustrant les dimensions interconnectées de la résilience organisationnelle.",
    downloadPdf: 'Télécharger le rapport PDF', generatingPdf: 'Génération du PDF…', pdfReady: 'Rapport téléchargé.', pdfError: 'Le rapport n’a pas pu être généré. Réessayez.', share: 'Partager le diagnostic', sharing: 'Partage…', shared: 'Lien partagé.', copied: 'Lien copié.', shareError: 'Le lien n’a pas pu être partagé.',
    conversionTitle: 'Vous connaissez vos priorités. Découvrez comment passer à l’action.', conversionText: 'Vous souhaitez approfondir votre diagnostic ou découvrir comment CORO peut accompagner votre organisation ? Échangez avec notre équipe.', conversionPrimary: 'Demander une évaluation approfondie', conversionSecondary: 'Découvrir CORO', conversionFormTitle: 'Parler à l’équipe CORO',
  },
  en: {
    eyebrow: 'CORO · Express diagnostic', title: 'Is your organization truly ready?', lead: 'Assess your operational readiness in eight questions. This initial, indicative review will help you structure the next steps.',
    facts: ['8 questions', 'About 2 minutes', 'Free', 'No registration'], start: 'Start the diagnostic', privacy: 'Your answers remain in this tab and are not sent to CORO.',
    progress: 'Progress', previous: 'Previous', next: 'Next', finish: 'Finish', choose: 'Select an answer to continue.', answered: 'questions answered',
    resultEyebrow: 'Your indicative result', score: 'Score', partialScore: 'Partial score', coverage: 'Coverage', level: 'Preparation level', provisional: 'Provisional result — Insufficient information to assign a preparation level.',
    dimensions: 'Review of all eight dimensions', strengths: 'Identified strengths', noStrength: 'No strength can be derived from favourable answers.', improvements: 'Improvement priorities', noImprovement: 'No corrective priority emerges from the declared answers.', verification: 'Verification priorities', noVerification: 'No unknown information requires verification.',
    recommendations: 'Detailed recommendations', practice: 'Good practice', action: 'Concrete action', issue: 'Operational issue', modules: 'Relevant CORO capabilities', plan: 'Improvement plan', days: 'days', limits: 'Methodological limitations',
    methodology: 'This diagnostic is indicative. It is based only on your answers, is not the official CORO Index and does not replace an audit or field validation.', criticalNa: 'One or more fundamental dimensions were declared not applicable; this conclusion should be validated.',
    availability: 'Availability', discover: 'Learn more', reset: 'Start again', privacyResult: 'Your answers remained in this tab and were not sent to CORO.', temporaryResult: 'Your result is temporary and will not be retained after you close or refresh this page.', switchResultLanguage: 'Voir le résultat en français',
    heroImageAlt: 'Illuminated office building representing an organization ready to act.', conclusionTitle: 'Your diagnostic is a first step. Resilience is built through action.', conclusionText: 'Turn this initial review into concrete priorities, then validate them with your teams and in the field.', conclusionImageAlt: 'Cutaway building illustrating the interconnected dimensions of organizational resilience.',
    downloadPdf: 'Download PDF report', generatingPdf: 'Generating PDF…', pdfReady: 'Report downloaded.', pdfError: 'The report could not be generated. Try again.', share: 'Share the diagnostic', sharing: 'Sharing…', shared: 'Link shared.', copied: 'Link copied.', shareError: 'The link could not be shared.',
    conversionTitle: 'You know your priorities. Discover how to take action.', conversionText: 'Would you like to explore your diagnostic further or discover how CORO can support your organization? Talk with our team.', conversionPrimary: 'Request an in-depth assessment', conversionSecondary: 'Discover CORO', conversionFormTitle: 'Talk with the CORO team',
  },
} as const;

type Phase = 'intro' | 'questions' | 'result';

export function DiagnosticExperience({ locale }: { locale: Locale }) {
  const t = ui[locale];
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState<DiagnosticResponses>({});
  const [ready, setReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const hydration = window.setTimeout(() => {
      const stored = parseDiagnosticState(sessionStorage.getItem(DIAGNOSTIC_STORAGE_KEY));
      if (stored) { setStep(stored.step); setResponses(stored.responses); setPhase('questions'); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(hydration);
  }, []);
  useEffect(() => {
    if (!ready || phase !== 'questions') return;
    sessionStorage.setItem(DIAGNOSTIC_STORAGE_KEY, JSON.stringify({ version: 1, step, responses }));
  }, [phase, ready, responses, step]);
  useEffect(() => { if (phase !== 'intro') heading.current?.focus(); }, [phase, step]);

  const start = () => { setPhase('questions'); setStep(0); };
  const reset = () => { sessionStorage.removeItem(DIAGNOSTIC_STORAGE_KEY); setResponses({}); setStep(0); setPhase('intro'); };
  const select = (value: DiagnosticAnswerId) => setResponses((current) => ({ ...current, [diagnosticQuestions[step].id]: value }));
  const advance = () => {
    if (!responses[diagnosticQuestions[step].id]) return;
    if (step < DIAGNOSTIC_QUESTION_COUNT - 1) setStep((value) => value + 1);
    else { sessionStorage.removeItem(DIAGNOSTIC_STORAGE_KEY); setPhase('result'); }
  };

  if (!ready) return <div className={styles.loading} aria-live="polite" />;
  if (phase === 'intro') return <div className={styles.page}><section className={styles.hero} aria-labelledby="diagnostic-title"><div className={styles.heroInner}>
    <div className={styles.heroContent}><p className={styles.eyebrow}>{t.eyebrow}</p><h1 id="diagnostic-title">{t.title}</h1><p className={styles.lead}>{t.lead}</p>
      <ul className={styles.facts}>{t.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul><button className={styles.primary} type="button" onClick={start}>{t.start}</button><p className={styles.privacy}>{t.privacy}</p>
    </div><div className={styles.heroVisual}><Image src="/images/Coro_Diagnostic/coro-diagnostic-hero.webp" alt={t.heroImageAlt} width={1200} height={630} sizes="(max-width: 767px) calc(100vw - 2rem), 44vw" fetchPriority="high" /></div>
  </div></section></div>;
  if (phase === 'result') return <DiagnosticResult locale={locale} responses={responses as CompleteDiagnosticResponses} reset={reset} heading={heading} />;

  const current = diagnosticQuestions[step]; const selected = responses[current.id]; const answered = Object.keys(responses).length;
  return <div className={styles.page}><section className={styles.questionSection} aria-labelledby="question-title">
    <div className={styles.progressHeader}><div><span>{t.progress}</span><strong>{step + 1} / {DIAGNOSTIC_QUESTION_COUNT}</strong></div><span>{answered} {t.answered}</span></div>
    <div className={styles.progressTrack} role="progressbar" aria-label={t.progress} aria-valuemin={1} aria-valuemax={DIAGNOSTIC_QUESTION_COUNT} aria-valuenow={step + 1}><span style={{ width: `${((step + 1) / DIAGNOSTIC_QUESTION_COUNT) * 100}%` }} /></div>
    <div className={styles.questionCard}><p className={styles.dimension}>{current.id} · {current.dimension[locale]}</p><h1 ref={heading} tabIndex={-1} id="question-title">{current.question[locale]}</h1>
      <fieldset className={styles.answers}><legend className={styles.srOnly}>{t.choose}</legend>{current.answers.map((answer) => <label key={answer.id} className={styles.answer} data-selected={selected === answer.id || undefined}><input type="radio" name={current.id} value={answer.id} checked={selected === answer.id} onChange={() => select(answer.id)} /><span className={styles.answerId}>{answer.id}</span><span>{answer.label[locale]}</span></label>)}</fieldset>
      <div className={styles.controls}><button className={styles.secondary} type="button" onClick={() => step === 0 ? setPhase('intro') : setStep((value) => value - 1)}>{t.previous}</button><button className={styles.primary} type="button" onClick={advance} disabled={!selected} aria-describedby={!selected ? 'answer-required' : undefined}>{step === DIAGNOSTIC_QUESTION_COUNT - 1 ? t.finish : t.next}</button></div>
      {!selected && <p id="answer-required" className={styles.hint}>{t.choose}</p>}
    </div>
  </section></div>;
}

function DiagnosticResult({ locale, responses, reset, heading }: { locale: Locale; responses: CompleteDiagnosticResponses; reset: () => void; heading: RefObject<HTMLHeadingElement | null> }) {
  const [resultLocale, setResultLocale] = useState<Locale>(locale);
  const [pdfStatus, setPdfStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');
  const [shareStatus, setShareStatus] = useState<'idle' | 'busy' | 'shared' | 'copied' | 'error'>('idle');
  const [showCommercialForm, setShowCommercialForm] = useState(false);
  const t = ui[resultLocale]; const result = buildDiagnosticResult(responses); const { evaluation } = result;
  const limitationCritical = evaluation.limitations.some((item) => item.code === 'CRITICAL_DIMENSION_NOT_APPLICABLE');
  const downloadPdf = async () => {
    setPdfStatus('busy');
    try {
      const pdf = await import('@/lib/diagnostic/pdf');
      const logoDataUrl = await pdf.loadCoroLogoDataUrl();
      const bytes = pdf.generateDiagnosticPdf({ model: result, responses, locale: resultLocale, generatedAt: new Date(), logoDataUrl });
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }));
      const link = document.createElement('a'); link.href = url; link.download = `coro-diagnostic-express-${resultLocale}.pdf`; document.body.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setPdfStatus('success');
    } catch { setPdfStatus('error'); }
  };
  const shareDiagnostic = async () => {
    setShareStatus('busy');
    const url = `${window.location.origin}/diagnostic${resultLocale === 'en' ? '?lang=en' : ''}`;
    try {
      if (navigator.share) { await navigator.share({ title: t.title, text: t.lead, url }); setShareStatus('shared'); }
      else { await navigator.clipboard.writeText(url); setShareStatus('copied'); }
    } catch (error) { if ((error as Error).name === 'AbortError') setShareStatus('idle'); else setShareStatus('error'); }
  };
  return <div className={styles.resultPage} lang={resultLocale === 'fr' ? 'fr-CA' : 'en-CA'}>
    <section className={styles.resultHero} aria-labelledby="result-title"><div><p className={styles.eyebrow}>{t.resultEyebrow}</p><h1 ref={heading} tabIndex={-1} id="result-title">{evaluation.level ? diagnosticLevelLabel(evaluation.level, resultLocale) : t.provisional}</h1><p className={styles.resultSummary}>{diagnosticSummary(result, resultLocale)}</p><p className={styles.resultPrivacy}>{t.privacyResult}</p><p className={styles.temporaryResult}>{t.temporaryResult}</p><button className={styles.languageSwitch} type="button" onClick={() => setResultLocale((current) => current === 'fr' ? 'en' : 'fr')}>{t.switchResultLanguage}</button></div>
      <dl className={styles.scorePanel}><div><dt>{evaluation.isDefinitive ? t.score : t.partialScore}</dt><dd>{evaluation.score === null ? '—' : `${evaluation.score} %`}</dd></div><div><dt>{t.coverage}</dt><dd>{evaluation.coveragePercent} % <small>({evaluation.evaluableCount}/8)</small></dd></div><div><dt>{t.level}</dt><dd>{evaluation.level ? diagnosticLevelLabel(evaluation.level, resultLocale) : '—'}</dd></div></dl>
    </section>
    <ResiliencePortrait responses={responses} locale={resultLocale} />
    <section className={styles.resultActions} aria-label={resultLocale === 'fr' ? 'Exporter et partager' : 'Export and share'}><div><button className={styles.primary} type="button" onClick={downloadPdf} disabled={pdfStatus === 'busy'}>{pdfStatus === 'busy' ? t.generatingPdf : t.downloadPdf}</button><button className={styles.secondary} type="button" onClick={shareDiagnostic} disabled={shareStatus === 'busy'}>{shareStatus === 'busy' ? t.sharing : t.share}</button></div><p role="status" aria-live="polite">{pdfStatus === 'success' ? t.pdfReady : pdfStatus === 'error' ? t.pdfError : shareStatus === 'shared' ? t.shared : shareStatus === 'copied' ? t.copied : shareStatus === 'error' ? t.shareError : ''}</p></section>
    <ResultSection id="strengths-title" title={t.strengths}>{result.strengths.length ? <div className={styles.compactGrid}>{result.strengths.map((item) => <article key={item.dimensionId}><h3>{diagnosticDimensionLabel(item.dimensionId, resultLocale)}</h3><p>{item.observation[resultLocale]}</p></article>)}</div> : <p className={styles.emptyState}>{t.noStrength}</p>}</ResultSection>
    <ResultSection id="priorities-title" title={t.improvements}>{result.improvementRecommendations.length ? <div className={styles.priorityGrid}>{result.improvementRecommendations.map((item) => <article key={item.dimensionId} className={styles.priorityCard}><p>{item.dimensionId}</p><h3>{diagnosticDimensionLabel(item.dimensionId, resultLocale)}</h3><p>{item.action[resultLocale]}</p></article>)}</div> : <p className={styles.emptyState}>{t.noImprovement}</p>}</ResultSection>
    <ResultSection id="verification-title" title={t.verification}>{result.verificationRecommendations.length ? <div className={styles.compactGrid}>{result.verificationRecommendations.map((item) => <article key={item.dimensionId}><h3>{diagnosticDimensionLabel(item.dimensionId, resultLocale)}</h3><p>{item.action[resultLocale]}</p></article>)}</div> : <p className={styles.emptyState}>{t.noVerification}</p>}</ResultSection>
    <ResultSection id="recommendations-title" title={t.recommendations}><div className={styles.recommendationList}>{result.detailedRecommendations.map((item) => <article key={item.dimensionId} className={styles.recommendationCard}><header><span>{item.dimensionId}</span><h3>{diagnosticDimensionLabel(item.dimensionId, resultLocale)}</h3></header><p>{item.observation[resultLocale]}</p><dl><div><dt>{t.issue}</dt><dd>{item.operationalIssue[resultLocale]}</dd></div><div><dt>{t.practice}</dt><dd>{item.goodPractice[resultLocale]}</dd></div><div><dt>{t.action}</dt><dd>{item.action[resultLocale]}</dd></div></dl></article>)}</div></ResultSection>
    <ResultSection id="plan-title" title={t.plan}><ol className={styles.planGrid}>{result.plan.map((planStep) => <li key={planStep.period}><span>{planStep.period} {t.days}</span><h3>{diagnosticDimensionLabel(planStep.dimensionId, resultLocale)}</h3><p>{planStep.recommendation.action[resultLocale]}</p></li>)}</ol></ResultSection>
    {result.relevantModules.length > 0 && <ResultSection id="modules-title" title={t.modules}><div className={styles.moduleGrid}>{result.relevantModules.map((moduleItem) => <article key={moduleItem.id}><div><h3>{moduleItem.name[resultLocale]}</h3><span>{t.availability}: {moduleItem.availabilityLabel[resultLocale]}</span></div><p>{moduleItem.qualification[resultLocale]}</p>{moduleItem.publicPath && <a href={`${moduleItem.publicPath}${resultLocale === 'en' ? '?lang=en' : ''}`}>{t.discover}</a>}</article>)}</div></ResultSection>}
    <section className={styles.commercialConversion} aria-labelledby="commercial-conversion-title"><div className={styles.commercialIntro}><div><p className={styles.eyebrow}>CORO</p><h2 id="commercial-conversion-title">{t.conversionTitle}</h2><p>{t.conversionText}</p></div><div className={styles.commercialActions}><button className={styles.primary} type="button" aria-expanded={showCommercialForm} aria-controls="diagnostic-commercial-form" onClick={() => setShowCommercialForm((value) => !value)}>{t.conversionPrimary}</button><Link className={styles.secondaryLink} href={resultLocale === 'en' ? '/?lang=en' : '/'}>{t.conversionSecondary}</Link></div></div>{showCommercialForm && <div id="diagnostic-commercial-form" className={styles.commercialForm}><h3>{t.conversionFormTitle}</h3><DemoForm lang={resultLocale} variant="diagnostic" diagnosticSummary={buildDiagnosticCommercialSummary(result, resultLocale)} /></div>}</section>
    <section className={styles.visualConclusion} aria-labelledby="visual-conclusion-title"><div><h2 id="visual-conclusion-title">{t.conclusionTitle}</h2><p>{t.conclusionText}</p></div><Image src="/images/Coro_Diagnostic/coro-diagnostic-dimensions.webp" alt={t.conclusionImageAlt} width={1200} height={654} sizes="(max-width: 767px) calc(100vw - 2rem), 48vw" /></section>
    <section className={styles.resultFooter} aria-labelledby="limits-title"><h2 id="limits-title">{t.limits}</h2><p>{t.methodology}</p>{limitationCritical && <p className={styles.warning}>{t.criticalNa}</p>}<button className={styles.secondary} type="button" onClick={reset}>{t.reset}</button></section>
  </div>;
}

function ResultSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section className={styles.resultSection} aria-labelledby={id}><h2 id={id}>{title}</h2>{children}</section>;
}
