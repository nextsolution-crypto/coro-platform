'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

type Question = { id: string; text: string; choices: string[] };
type Questionnaire = { title: string; passingPercent: number; questions: Question[] };
type Result = {
  correctCount: number;
  totalCount: number;
  percent: number;
  passed: boolean;
  passingPercent: number;
  corrections: Array<{ id: string; correct: boolean; correctChoice: string }>;
};

/**
 * Questionnaire post-formation, ouvert par code QR : aucun compte requis.
 * Le participant indique son nom, répond, puis voit son score et la correction.
 */
export default function QuestionnairePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<Questionnaire | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    void fetch(`${API_URL}/public/questionnaires/${encodeURIComponent(token)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || 'Questionnaire introuvable.');
        setData(body);
        setAnswers(body.questions.map(() => null));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Questionnaire introuvable.'));
  }, [token]);

  const complete = name.trim().length >= 2 && answers.length > 0 && answers.every((answer) => answer !== null);

  const submit = async () => {
    if (!complete) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/public/questionnaires/${encodeURIComponent(token)}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: name.trim(), answers }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'Envoi impossible.');
      setResult(body);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Envoi impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', padding: '24px 16px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <p style={{ fontWeight: 800, color: '#C0392B', letterSpacing: 1, marginBottom: 4 }}>CORO</p>

        {error && !data && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', borderRadius: 6, padding: 20 }}>
            <h1 style={{ fontSize: 18, color: '#2C3E50', margin: 0 }}>Questionnaire indisponible</h1>
            <p style={{ color: '#6C757D', fontSize: 14 }}>{error}</p>
          </div>
        )}

        {!data && !error && <p style={{ color: '#ADB5BD' }}>Chargement…</p>}

        {data && result && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', borderRadius: 6, padding: 20 }}>
            <h1 style={{ fontSize: 20, color: '#2C3E50', margin: '0 0 8px' }}>Merci, {name.trim()} !</h1>
            <p style={{ fontSize: 32, fontWeight: 800, margin: '8px 0', color: result.passed ? '#27AE60' : '#C0392B' }}>
              {result.correctCount}/{result.totalCount} · {result.percent} %
            </p>
            <p style={{ color: '#2C3E50', fontSize: 15 }}>
              {result.passed
                ? 'Réussi. Vos réponses ont été transmises à votre formateur.'
                : `Seuil de réussite : ${result.passingPercent} %. Vos réponses ont été transmises à votre formateur, qui pourra revoir ces points avec vous.`}
            </p>
            <h2 style={{ fontSize: 15, color: '#2C3E50', marginTop: 20 }}>Correction</h2>
            <ol style={{ paddingLeft: 20 }}>
              {data.questions.map((question, index) => {
                const correction = result.corrections[index];
                return (
                  <li key={question.id} style={{ marginBottom: 12, color: '#2C3E50', fontSize: 14 }}>
                    <p style={{ margin: '0 0 4px' }}>{question.text}</p>
                    <p style={{ margin: 0, color: correction?.correct ? '#27AE60' : '#C0392B', fontWeight: 600 }}>
                      {correction?.correct ? '✓ Bonne réponse' : `✗ Bonne réponse : ${correction?.correctChoice}`}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {data && !result && (
          <>
            <h1 style={{ fontSize: 22, color: '#2C3E50', margin: '0 0 4px' }}>{data.title}</h1>
            <p style={{ color: '#6C757D', fontSize: 14, marginTop: 0 }}>
              {data.questions.length} questions · réussite à {data.passingPercent} %
            </p>

            <label style={{ display: 'block', backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', borderRadius: 6, padding: 16, marginBottom: 16 }}>
              <span style={{ display: 'block', fontWeight: 600, color: '#2C3E50', fontSize: 14, marginBottom: 6 }}>Votre nom</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={120}
                placeholder="Prénom et nom"
                style={{ width: '100%', padding: '12px', fontSize: 16, border: '1px solid #CED4DA', borderRadius: 4, color: '#2C3E50' }}
              />
            </label>

            {data.questions.map((question, index) => (
              <fieldset key={question.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', borderRadius: 6, padding: 16, marginBottom: 12 }}>
                <legend style={{ fontWeight: 700, color: '#2C3E50', fontSize: 15, padding: '0 4px' }}>
                  {index + 1}. {question.text}
                </legend>
                {question.choices.map((choice, choiceIndex) => {
                  const selected = answers[index] === choiceIndex;
                  return (
                    <label
                      key={choiceIndex}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px', marginTop: 8,
                        borderRadius: 4, cursor: 'pointer', fontSize: 15, color: '#2C3E50',
                        border: `1px solid ${selected ? '#C0392B' : '#E9ECEF'}`,
                        backgroundColor: selected ? '#FDEDEC' : '#FFFFFF',
                      }}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={selected}
                        onChange={() => setAnswers((list) => list.map((value, i) => (i === index ? choiceIndex : value)))}
                        style={{ marginTop: 3 }}
                      />
                      <span>{choice}</span>
                    </label>
                  );
                })}
              </fieldset>
            ))}

            {error && <p role="alert" style={{ color: '#C0392B', fontSize: 14 }}>{error}</p>}
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!complete || submitting}
              style={{
                width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, color: '#FFFFFF', border: 'none',
                borderRadius: 4, backgroundColor: '#C0392B', opacity: !complete || submitting ? 0.5 : 1, marginBottom: 32,
              }}
            >
              {submitting ? 'Envoi…' : complete ? 'Envoyer mes réponses' : 'Indiquez votre nom et répondez à toutes les questions'}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
