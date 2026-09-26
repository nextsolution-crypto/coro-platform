'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import styles from './planning.module.css';

type Person = { id: string; firstName: string; lastName: string };
type ActivityTask = {
  id: string; activityId: string | null; taskTitle: string; categoryName: string; status: string;
  dueDate?: string | null; actualHours: number; projectTaskListId?: string | null; assignee?: Person | null;
  assignees?: Array<{ user: Person }>;
};
type ChecklistView = {
  projectTaskListId: string; taskListId: string; name: string; instantiationSource: string;
  isCurrentlyApplicable: boolean; taskCount: number; completedCount: number; actualHours: number; tasks: ActivityTask[];
};
type TaskView = {
  tasks: ActivityTask[]; taskCount: number; taskCompletedCount: number; taskOpenCount: number;
  taskProgressPercent: number | null; actualHours: number;
  directTasks: ActivityTask[]; instantiatedTaskLists: ChecklistView[];
  currentApplicableTaskLists: Array<{ taskListId: string; name: string }>;
  missingTaskLists: Array<{ taskListId: string; name: string }>;
  historicalTaskLists: ChecklistView[]; canonicalTypeMissing: boolean; isCancelled: boolean;
};
type Candidate = Pick<ActivityTask, 'id' | 'taskTitle' | 'categoryName' | 'status' | 'dueDate' | 'assignee'>;

const statusLabels: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' };

function message(cause: unknown) {
  const value = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
  return typeof value === 'string' ? value : 'La tâche n’a pas pu être modifiée. Actualisez puis réessayez.';
}

function hours(value: number) {
  const whole = Math.floor(value); const minutes = Math.round((value - whole) * 60);
  return minutes ? `${whole} h ${String(minutes).padStart(2, '0')}` : `${whole} h`;
}

export default function ActivityTasksSection({ projectId, activityId, canMutate }: {
  projectId: string; activityId: string; canMutate: boolean;
}) {
  const [view, setView] = useState<TaskView | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const response = await api.get<TaskView>(`/projects/${projectId}/activities/${activityId}/tasks`);
    setView(response.data);
  }, [activityId, projectId]);

  useEffect(() => { load().catch(cause => setError(message(cause))); }, [load]);

  const create = async () => {
    if (!newTitle.trim()) return;
    setBusy('create'); setError('');
    try {
      await api.post(`/projects/${projectId}/tasks`, {
        activityId, taskTitle: newTitle.trim(), categoryName: 'Activité',
      });
      setNewTitle(''); setCreating(false); await load();
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(''); }
  };

  const showCandidates = async () => {
    setBusy('candidates'); setError('');
    try {
      const response = await api.get<Candidate[]>(`/projects/${projectId}/activities/${activityId}/task-candidates`);
      setCandidates(response.data);
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(''); }
  };

  const setActivity = async (taskId: string, nextActivityId: string | null) => {
    setBusy(taskId); setError('');
    try {
      await api.put(`/projects/${projectId}/tasks/${taskId}/activity`, { activityId: nextActivityId });
      setCandidates(null); await load();
    } catch (cause) { setError(message(cause)); await load().catch(() => undefined); }
    finally { setBusy(''); }
  };

  const instantiateMissing = async () => {
    setBusy('instantiate'); setError('');
    try {
      const response = await api.post<{ createdLists: string[] }>(
        `/projects/${projectId}/activities/${activityId}/task-lists/instantiate`,
      );
      const count = response.data.createdLists.length;
      toast(count === 1 ? '1 checklist ajoutée' : count > 1 ? `${count} checklists ajoutées` : 'Aucune nouvelle checklist à ajouter.');
      await load();
    } catch (cause) { setError(message(cause)); }
    finally { setBusy(''); }
  };

  const renderTasks = (tasks: ActivityTask[]) => tasks.map(task => <article className={styles.taskRow} key={task.id}>
    <div><strong>{task.status === 'fait' ? '✓' : '○'} {task.taskTitle}</strong>
      <span>{statusLabels[task.status] ?? task.status} · {task.categoryName}{task.actualHours ? ` · ${hours(task.actualHours)}` : ''}</span>
      {(task.assignee || task.assignees?.length) && <small>Responsable : {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : task.assignees?.map(item => `${item.user.firstName} ${item.user.lastName}`).join(', ')}</small>}
      {task.dueDate && <small>Échéance : {new Date(task.dueDate).toLocaleDateString('fr-CA')}</small>}
    </div>
    {canMutate && !task.projectTaskListId && task.status === 'a_faire' && task.actualHours === 0 && <button type="button" className={styles.inlineButton}
      disabled={busy === task.id} onClick={() => setActivity(task.id, null)}>Retirer de cette activité</button>}
  </article>);

  return <section className={styles.taskSection} aria-busy={!view || Boolean(busy)}>
    <div className={styles.taskHeading}><div><h3>Tâches</h3>
      {view && <p>{view.taskCount} au total · {view.taskCompletedCount} terminée{view.taskCompletedCount === 1 ? '' : 's'} · {view.taskOpenCount} ouverte{view.taskOpenCount === 1 ? '' : 's'}</p>}
    </div>{view && <strong>{view.taskProgressPercent === null ? '—' : `${view.taskProgressPercent} %`}</strong>}</div>
    {view && <p className={styles.taskMetrics}>Progression {view.taskProgressPercent === null ? 'non calculée' : `${view.taskProgressPercent} %`} · Temps réalisé {hours(view.actualHours)}</p>}
    {!view && !error && <p className={styles.notice}>Chargement des tâches…</p>}
    {view?.canonicalTypeMissing && <p className={styles.notice}>Définissez d’abord un type d’activité pour déterminer les checklists applicables.</p>}
    {view && view.missingTaskLists.length > 0 && <div className={styles.missingChecklists}>
      <p><strong>{view.missingTaskLists.length} nouvelle{view.missingTaskLists.length === 1 ? '' : 's'} checklist{view.missingTaskLists.length === 1 ? '' : 's'} disponible{view.missingTaskLists.length === 1 ? '' : 's'}</strong></p>
      {canMutate && !view.isCancelled && !view.canonicalTypeMissing && <button type="button" className={styles.primaryButton}
        disabled={busy === 'instantiate'} onClick={instantiateMissing}>Ajouter les checklists manquantes</button>}
    </div>}
    {view?.instantiatedTaskLists.length ? <div className={styles.checklistGroup}><h4>Checklists</h4>
      {view.instantiatedTaskLists.map(checklist => <section className={styles.checklist} key={checklist.projectTaskListId}>
        <div className={styles.checklistHeading}><div><strong>{checklist.name}</strong>
          <span>{checklist.completedCount} / {checklist.taskCount} tâches · {hours(checklist.actualHours)}</span></div>
          <em className={checklist.isCurrentlyApplicable ? undefined : styles.historicalChecklist}>{checklist.isCurrentlyApplicable ? 'Actuelle' : 'Historique'}</em></div>
        {checklist.tasks.length ? renderTasks(checklist.tasks) : <p className={styles.taskEmpty}>Aucune tâche dans cette checklist.</p>}
      </section>)}
    </div> : null}
    {view?.directTasks.length ? <div className={styles.directTasks}><h4>Tâches de l’activité</h4>{renderTasks(view.directTasks)}</div> : null}
    {view?.tasks.length === 0 && <p className={styles.taskEmpty}>Aucune tâche liée à cette activité.</p>}
    {canMutate && <div className={styles.taskActions}>
      <button type="button" className={styles.inlineButton} onClick={() => setCreating(value => !value)}>Ajouter une tâche</button>
      <button type="button" className={styles.inlineButton} disabled={busy === 'candidates'} onClick={showCandidates}>Rattacher une tâche existante</button>
    </div>}
    {creating && <div className={styles.taskCreate}><label>Titre de la tâche<input value={newTitle} maxLength={200}
      onChange={event => setNewTitle(event.target.value)} /></label><button type="button" className={styles.primaryButton}
      disabled={!newTitle.trim() || busy === 'create'} onClick={create}>Créer</button></div>}
    {candidates && <div className={styles.taskCandidates}><h4>Tâches transversales admissibles</h4>
      {candidates.length === 0 ? <p>Aucune tâche admissible.</p> : candidates.map(task => <div key={task.id}>
        <span>{task.taskTitle}</span><button type="button" className={styles.inlineButton} disabled={busy === task.id}
          onClick={() => setActivity(task.id, activityId)}>Rattacher</button></div>)}</div>}
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
