'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { confirmAction } from '@/lib/confirm-dialog';
import { useAuthStore } from '@/stores/auth.store';

type Question = { id?: string; text: string; choices: string[]; correct: number };
type Entry = {
  activityTypeCode: string;
  activityTypeName: string;
  questionnaire: {
    id: string | null;
    source: 'CORO' | 'ORGANIZATION';
    title: string;
    passingPercent: number;
    questions: Question[];
  } | null;
};

const blankQuestion = (): Question => ({ text: '', choices: ['', '', '', ''], correct: 0 });

/** Paramètres : banques de questions des questionnaires post-formation, par type de formation. */
export default function TrainingQuestionnairesPage() {
  const router = useRouter();
  const { user, isInitialized, initAuth } = useAuthStore();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [title, setTitle] = useState('');
  const [passingPercent, setPassingPercent] = useState(80);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  const load = async (keep?: string) => {
    const response = await api.get('/training-questionnaires');
    const list: Entry[] = response.data || [];
    setEntries(list);
    const code = keep || selected || list[0]?.activityTypeCode || '';
    choose(list, code);
  };

  const choose = (list: Entry[], code: string) => {
    setSelected(code);
    const entry = list.find((item) => item.activityTypeCode === code);
    const q = entry?.questionnaire;
    setTitle(q?.title || `Questionnaire — ${entry?.activityTypeName || ''}`);
    setPassingPercent(q?.passingPercent ?? 80);
    setQuestions(q?.questions?.length ? q.questions.map((item) => ({ ...item, choices: [...item.choices] })) : [blankQuestion()]);
  };

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    void load().catch(() => toast('Les questionnaires ne peuvent pas être chargés.', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, user]);

  const current = entries.find((item) => item.activityTypeCode === selected);

  const update = (index: number, patch: Partial<Question>) =>
    setQuestions((list) => list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/training-questionnaires/${selected}`, {
        title,
        passingPercent,
        questions: questions.map((item) => ({ ...item, choices: item.choices.filter((choice) => choice.trim()) })),
      });
      toast('Questionnaire enregistré pour votre organisation.', 'success');
      await load(selected);
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Vérifiez les questions.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    const ok = await confirmAction({
      title: 'Revenir au questionnaire CORO',
      message: 'La version de votre organisation sera remplacée par le questionnaire CORO par défaut. Les séances déjà ouvertes gardent leurs questions.',
      confirmLabel: 'Revenir au questionnaire CORO',
    });
    if (!ok) return;
    await api.delete(`/training-questionnaires/${selected}`);
    toast('Questionnaire CORO rétabli.', 'success');
    await load(selected);
  };

  return (
    <AppLayout>
      <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: '#ADB5BD' }}>Paramètres</p>
      <h1 className="text-2xl font-black" style={{ color: '#2C3E50' }}>Questionnaires de formation</h1>
      <div className="mb-2 mt-2 h-1 w-16" style={{ backgroundColor: '#C0392B' }} />
      <p className="mb-6 max-w-3xl text-sm" style={{ color: '#6C757D' }}>
        Chaque type de formation a son questionnaire post-formation, ouvert par code QR depuis l’activité. CORO fournit un questionnaire par défaut ; votre organisation peut l’adapter. Les séances déjà ouvertes gardent les questions du moment.
      </p>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <nav aria-label="Types de formation" className="rounded-md bg-white p-2" style={{ border: '1px solid #E9ECEF' }}>
          {entries.map((entry) => (
            <button
              key={entry.activityTypeCode}
              type="button"
              onClick={() => choose(entries, entry.activityTypeCode)}
              className="block w-full rounded px-3 py-2 text-left text-sm"
              style={{
                backgroundColor: entry.activityTypeCode === selected ? '#FDEDEC' : 'transparent',
                color: entry.activityTypeCode === selected ? '#C0392B' : '#2C3E50',
              }}
            >
              {entry.activityTypeName}
              <span className="block text-xs" style={{ color: '#ADB5BD' }}>
                {entry.questionnaire ? (entry.questionnaire.source === 'ORGANIZATION' ? 'Version de l’organisation' : 'Questionnaire CORO') : 'Aucun questionnaire'}
              </span>
            </button>
          ))}
        </nav>

        {current && (
          <section className="rounded-md bg-white p-5" style={{ border: '1px solid #E9ECEF' }}>
            <div className="mb-4 grid gap-4 sm:grid-cols-[1fr_160px]">
              <label className="text-xs font-semibold uppercase" style={{ color: '#6C757D' }}>
                Titre
                <input value={title} disabled={!isAdmin} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded px-3 py-2 text-sm normal-case" style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </label>
              <label className="text-xs font-semibold uppercase" style={{ color: '#6C757D' }}>
                Réussite (%)
                <input type="number" min={0} max={100} value={passingPercent} disabled={!isAdmin} onChange={(e) => setPassingPercent(Number(e.target.value))} className="mt-1 block w-full rounded px-3 py-2 text-sm" style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} />
              </label>
            </div>

            {questions.map((question, index) => (
              <fieldset key={index} className="mb-4 rounded-md p-4" style={{ border: '1px solid #E9ECEF' }} disabled={!isAdmin}>
                <legend className="px-1 text-xs font-semibold" style={{ color: '#6C757D' }}>Question {index + 1}</legend>
                <textarea value={question.text} onChange={(e) => update(index, { text: e.target.value })} rows={2} className="mb-2 block w-full rounded px-3 py-2 text-sm" style={{ border: '1px solid #CED4DA', color: '#2C3E50' }} placeholder="Énoncé de la question" />
                {question.choices.map((choice, choiceIndex) => (
                  <label key={choiceIndex} className="mb-1 flex items-center gap-2 text-sm">
                    <input type="radio" name={`correct-${index}`} checked={question.correct === choiceIndex} onChange={() => update(index, { correct: choiceIndex })} aria-label={`Bonne réponse : choix ${choiceIndex + 1}`} />
                    <input value={choice} onChange={(e) => update(index, { choices: question.choices.map((c, i) => (i === choiceIndex ? e.target.value : c)) })} className="flex-1 rounded px-3 py-1.5 text-sm" style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }} placeholder={`Réponse ${choiceIndex + 1}`} />
                  </label>
                ))}
                <p className="mt-1 text-xs" style={{ color: '#ADB5BD' }}>Cochez la bonne réponse. Les réponses vides sont ignorées.</p>
                {isAdmin && questions.length > 1 && (
                  <button type="button" onClick={() => setQuestions((list) => list.filter((_, i) => i !== index))} className="mt-2 text-xs underline" style={{ color: '#C0392B' }}>
                    Retirer la question
                  </button>
                )}
              </fieldset>
            ))}

            {isAdmin ? (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setQuestions((list) => [...list, blankQuestion()])} className="rounded px-4 py-2 text-sm" style={{ border: '1px solid #DEE2E6', color: '#2C3E50' }}>
                  + Ajouter une question
                </button>
                <button type="button" disabled={saving} onClick={() => void save()} className="rounded px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#C0392B' }}>
                  {saving ? 'Enregistrement…' : 'Enregistrer pour mon organisation'}
                </button>
                {current.questionnaire?.source === 'ORGANIZATION' && (
                  <button type="button" onClick={() => void reset()} className="rounded px-4 py-2 text-sm" style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}>
                    Revenir au questionnaire CORO
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: '#6C757D' }}>Seul un administrateur peut modifier les questionnaires.</p>
            )}
          </section>
        )}
      </div>
    </AppLayout>
  );
}
