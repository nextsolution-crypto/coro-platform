'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/auth.store';
import { formatCivilDate } from '@/app/planning/time';

type Person = { id: string; firstName: string; lastName: string };
type Task = { id: string; activityId: string | null; projectTaskListId: string | null; taskTitle: string;
  categoryName: string; status: string; dueDate?: string | null; actualHours: number; assignee?: Person | null };
type TaskGroup = { projectTaskListId: string; name: string; taskCount: number; completedTaskCount: number;
  taskProgressPercent: number | null; actualHours: number; tasks: Task[]; isCurrentlyApplicable?: boolean };
type Activity = { id: string; label: string; status: string; duration: string; scheduledDate?: string | null;
  canonicalTypeMissing: boolean; planningStatus: string; lead?: { displayName: string; status: string } | null;
  taskCount: number; completedTaskCount: number; taskProgressPercent: number | null; actualHours: number;
  checklists: TaskGroup[]; linkedExistingLists: TaskGroup[]; directTasks: Task[];
  missingTaskLists: Array<{ taskListId: string; name: string }> };
type WorkView = { summary: { budgetHours: number | null; actualHours: number; plannedHours: number;
  budgetRemainingHours: number | null; unplannedRemainingHours: number | null };
  activities: Activity[]; transversal: TaskGroup; legacyLists: TaskGroup[];
  classification: { activityTaskCount: number; legacyTaskCount: number; transversalTaskCount: number; totalTaskCount: number } };

const planningLabels: Record<string, string> = { TO_PLAN: 'À planifier', LEAD_PENDING: 'Affectation à confirmer',
  PLANNED: 'Planifiée', CONFIRMED: 'Confirmée' };
const statusLabels: Record<string, string> = { a_faire: 'À faire', en_cours: 'En cours', fait: 'Fait' };

function hours(value: number | null) {
  if (value === null) return '—';
  return `${Number(value.toFixed(2)).toLocaleString('fr-CA')} h`;
}

function errorMessage(cause: unknown) {
  const value = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
  return typeof value === 'string' ? value : 'La modification a échoué. Actualisez puis réessayez.';
}

export default function MandateWorkTab({ projectId, teamMembers }: { projectId: string; teamMembers: Person[] }) {
  const role = useAuthStore(state => state.user?.role);
  const canMutate = ['ADMIN', 'SUPER_ADMIN', 'OPERATOR'].includes(role ?? '');
  const [view, setView] = useState<WorkView | null>(null);
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('ACTIVE');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [linkTargets, setLinkTargets] = useState<Record<string, string>>({});
  const [timeTask, setTimeTask] = useState<Task | null>(null);
  const [timeForm, setTimeForm] = useState({ date: new Date().toISOString().slice(0, 10), heures: '', note: '' });

  const load = useCallback(async () => {
    const response = await api.get<WorkView>(`/projects/${projectId}/mandate/work`);
    setView(response.data);
  }, [projectId]);
  useEffect(() => { load().catch(cause => setError(errorMessage(cause))); }, [load]);

  const mutateTask = async (taskId: string, data: Record<string, unknown>) => {
    setBusy(taskId); setError('');
    try { await api.put(`/projects/${projectId}/tasks/${taskId}`, data); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  };
  const linkTask = async (taskId: string) => {
    const activityId = linkTargets[taskId]; if (!activityId) return;
    setBusy(taskId); setError('');
    try { await api.put(`/projects/${projectId}/tasks/${taskId}/activity`, { activityId }); await load(); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  };
  const addTime = async () => {
    if (!timeTask || !timeForm.heures) return;
    setBusy(`time-${timeTask.id}`); setError('');
    try {
      await api.post(`/projects/${projectId}/tasks/${timeTask.id}/time`, {
        date: timeForm.date, heures: Number(timeForm.heures), note: timeForm.note || null,
      });
      setTimeTask(null); setTimeForm({ date: new Date().toISOString().slice(0, 10), heures: '', note: '' }); await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  };
  const instantiate = async (activity: Activity) => {
    setBusy(`instantiate-${activity.id}`); setError('');
    try {
      const response = await api.post<{ createdLists: string[] }>(
        `/projects/${projectId}/activities/${activity.id}/task-lists/instantiate`,
      );
      const count = response.data.createdLists.length;
      toast(count === 1 ? '1 checklist ajoutée' : count ? `${count} checklists ajoutées` : 'Aucune nouvelle checklist à ajouter.');
      await load();
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  };

  const TaskRow = ({ task, transversal = false }: { task: Task; transversal?: boolean }) => <div className="rounded-md border border-gray-200 p-3 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
    <div className="min-w-0"><strong className="text-sm break-words">{task.status === 'fait' ? '✓' : '○'} {task.taskTitle}</strong>
      <p className="text-xs text-gray-500">{task.categoryName} · {hours(task.actualHours)}</p></div>
    {canMutate && <div className="flex flex-wrap gap-2 items-center">
      <select aria-label={`Statut de ${task.taskTitle}`} value={task.status} disabled={busy === task.id}
        onChange={event => mutateTask(task.id, { status: event.target.value, dueDate: task.dueDate ?? null,
          assigneeId: task.assignee?.id ?? null })} className="text-xs border rounded px-2 py-1.5">
        {Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select>
      <input aria-label={`Échéance de ${task.taskTitle}`} type="date" value={task.dueDate?.slice(0, 10) ?? ''}
        onChange={event => mutateTask(task.id, { status: task.status, dueDate: event.target.value || null,
          assigneeId: task.assignee?.id ?? null })} className="text-xs border rounded px-2 py-1" />
      <select aria-label={`Responsable de ${task.taskTitle}`} value={task.assignee?.id ?? ''}
        onChange={event => mutateTask(task.id, { status: task.status, dueDate: task.dueDate ?? null,
          assigneeId: event.target.value || null })} className="text-xs border rounded px-2 py-1.5">
        <option value="">Sans responsable</option>{teamMembers.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
      </select>
      <button type="button" onClick={() => setTimeTask(task)} className="text-xs border rounded px-2 py-1.5">Ajouter du temps</button>
      {transversal && task.status === 'a_faire' && task.actualHours === 0 && <><select aria-label={`Activity cible de ${task.taskTitle}`}
        value={linkTargets[task.id] ?? ''} onChange={event => setLinkTargets(value => ({ ...value, [task.id]: event.target.value }))}
        className="text-xs border rounded px-2 py-1.5"><option value="">Rattacher à…</option>
        {view?.activities.filter(activity => activity.status !== 'annule').map(activity => <option key={activity.id} value={activity.id}>{activity.label}</option>)}</select>
        <button type="button" disabled={!linkTargets[task.id] || busy === task.id} onClick={() => linkTask(task.id)}
          className="text-xs border rounded px-2 py-1.5 disabled:opacity-50">Rattacher</button></>}
    </div>}
  </div>;

  const Group = ({ group, badge }: { group: TaskGroup; badge?: string }) => {
    const key = group.projectTaskListId;
    const open = expandedGroups[key] === true;
    return <section className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <button type="button" onClick={() => setExpandedGroups(value => ({ ...value, [key]: !open }))}
        className="w-full text-left flex justify-between gap-3 items-start">
        <span><strong className="text-sm">{group.name}</strong><small className="block text-gray-500">{group.completedTaskCount} / {group.taskCount} tâches · {hours(group.actualHours)}</small></span>
        <span className="text-xs whitespace-nowrap">{badge ? `${badge} · ` : ''}{open ? 'Masquer' : 'Afficher les tâches'}</span>
      </button>
      {open && <div className="grid gap-2 mt-3">{group.tasks.length ? group.tasks.map(task => <TaskRow key={task.id} task={task} />) : <p className="text-xs text-gray-500">Aucune tâche.</p>}</div>}
    </section>;
  };

  if (!view && !error) return <p className="text-sm text-gray-500">Chargement du travail du mandat…</p>;
  const activities = view?.activities.filter(activity => filter === 'ALL' || filter === 'CANCELLED' ?
    filter === 'ALL' || activity.status === 'annule' : filter === 'DONE' ? ['fait', 'termine'].includes(activity.status) :
      filter === 'TO_PLAN' ? activity.planningStatus === 'TO_PLAN' : activity.status !== 'annule' && !['fait', 'termine'].includes(activity.status)) ?? [];

  return <div className="grid gap-6">
    {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">{error}</p>}
    {view && <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Synthèse du mandat">
      {[['Budget', hours(view.summary.budgetHours)], ['Réalisées', hours(view.summary.actualHours)],
        ['Planifiées', hours(view.summary.plannedHours)], ['Disponible', hours(view.summary.budgetRemainingHours)]].map(([label, value]) =>
        <div key={label} className="rounded-md border border-gray-200 bg-white p-3"><small className="text-gray-500 uppercase">{label}</small><strong className="block text-xl">{value}</strong></div>)}
      {view.summary.unplannedRemainingHours !== null && <p className="col-span-2 md:col-span-4 text-xs text-gray-500">dont {hours(view.summary.unplannedRemainingHours)} non planifiées</p>}
    </section>}
    <div className="flex flex-wrap gap-2" aria-label="Filtres des activités">{[['ACTIVE', 'Actives'], ['TO_PLAN', 'À planifier'], ['DONE', 'Terminées'], ['CANCELLED', 'Annulées'], ['ALL', 'Toutes']].map(([value, label]) =>
      <button type="button" key={value} onClick={() => setFilter(value)} aria-pressed={filter === value}
        className={`text-xs rounded px-3 py-2 border ${filter === value ? 'bg-red-700 text-white' : 'bg-white'}`}>{label}</button>)}</div>
    <section className="grid gap-3"><h2 className="text-sm font-bold uppercase text-gray-500">Activités</h2>
      {activities.length === 0 && <p className="text-sm text-gray-500">Aucune activité dans ce filtre.</p>}
      {activities.map(activity => {
        const open = expandedActivities[activity.id] === true;
        return <article key={activity.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <button type="button" className="w-full text-left flex justify-between gap-4 items-start"
            onClick={() => setExpandedActivities(value => ({ ...value, [activity.id]: !open }))} aria-expanded={open}>
            <span><strong>{activity.label}</strong><small className="block text-gray-500 mt-1">{activity.scheduledDate ? formatCivilDate(activity.scheduledDate) : 'Date à déterminer'} · {planningLabels[activity.planningStatus] ?? activity.planningStatus}{activity.lead ? ` · ${activity.lead.displayName}` : ''}</small>
              <small className="block text-gray-500">{activity.completedTaskCount} / {activity.taskCount} tâches · {hours(activity.actualHours)} · {activity.status}</small></span>
            <span className="text-xs whitespace-nowrap">{open ? 'Replier' : 'Ouvrir'}</span>
          </button>
          {open && <div className="grid gap-3 mt-4">
            {activity.canonicalTypeMissing && <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2">Type canonique manquant. Les tâches existantes restent disponibles.</p>}
            {activity.missingTaskLists.length > 0 && <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-blue-50 border border-blue-200 rounded p-3"><strong className="text-sm">{activity.missingTaskLists.length} nouvelle{activity.missingTaskLists.length === 1 ? '' : 's'} checklist{activity.missingTaskLists.length === 1 ? '' : 's'} disponible{activity.missingTaskLists.length === 1 ? '' : 's'}</strong>
              {canMutate && activity.status !== 'annule' && <button type="button" disabled={busy === `instantiate-${activity.id}`}
                onClick={() => instantiate(activity)} className="text-xs rounded bg-blue-700 text-white px-3 py-2 disabled:opacity-50">Ajouter les checklists manquantes</button>}</div>}
            {activity.checklists.map(checklist => <Group key={checklist.projectTaskListId} group={checklist} badge={checklist.isCurrentlyApplicable ? 'Actuelle' : 'Historique'} />)}
            {activity.linkedExistingLists.map(list => <Group key={list.projectTaskListId} group={list} badge="Liste existante" />)}
            {activity.directTasks.length > 0 && <section className="grid gap-2"><h3 className="text-xs font-bold uppercase text-gray-500">Tâches de l’activité</h3>{activity.directTasks.map(task => <TaskRow key={task.id} task={task} />)}</section>}
            {activity.taskCount === 0 && <p className="text-xs text-gray-500">Aucune tâche pour cette activité.</p>}
          </div>}
        </article>;
      })}
    </section>
    {view && <section className="grid gap-3"><h2 className="text-sm font-bold uppercase text-gray-500">Travail transversal</h2>
      <p className="text-xs text-gray-500">Tâches du mandat qui ne sont rattachées à aucune activité.</p>
      {view.transversal.tasks.length ? view.transversal.tasks.map(task => <TaskRow key={task.id} task={task} transversal />) : <p className="text-sm text-gray-500">Aucune tâche transversale.</p>}
    </section>}
    {view && view.legacyLists.length > 0 && <section className="grid gap-3"><h2 className="text-sm font-bold uppercase text-gray-500">Listes de travail existantes</h2>
      <p className="text-xs text-gray-500">Ces listes du mandat ne sont pas encore rattachées à une activité.</p>
      {view.legacyLists.map(list => <Group key={list.projectTaskListId} group={list} badge="Liste existante" />)}
    </section>}
    {timeTask && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="bg-white rounded-lg p-5 w-full max-w-sm grid gap-3">
      <h2 className="font-bold">Ajouter du temps</h2><p className="text-sm text-gray-500">{timeTask.taskTitle}</p>
      <label className="text-xs">Date<input type="date" value={timeForm.date} onChange={event => setTimeForm(value => ({ ...value, date: event.target.value }))} className="block w-full border rounded p-2 mt-1" /></label>
      <label className="text-xs">Heures<input type="number" min="0.25" step="0.25" value={timeForm.heures} onChange={event => setTimeForm(value => ({ ...value, heures: event.target.value }))} className="block w-full border rounded p-2 mt-1" /></label>
      <label className="text-xs">Note<input value={timeForm.note} onChange={event => setTimeForm(value => ({ ...value, note: event.target.value }))} className="block w-full border rounded p-2 mt-1" /></label>
      <div className="flex gap-2 justify-end"><button type="button" onClick={() => setTimeTask(null)} className="border rounded px-3 py-2 text-sm">Annuler</button><button type="button" disabled={!timeForm.heures || busy === `time-${timeTask.id}`} onClick={addTime} className="bg-blue-700 text-white rounded px-3 py-2 text-sm disabled:opacity-50">Enregistrer</button></div>
    </div></div>}
  </div>;
}
