'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import api from '@/lib/api';

export type MandatePerson = { id: string; firstName: string; lastName: string };
export type MandateTask = { id: string; activityId: string | null; projectTaskListId: string | null; taskTitle: string;
  categoryName: string; status: string; dueDate?: string | null; actualHours: number; assignee?: MandatePerson | null };
export type MandateTaskGroup = { projectTaskListId: string; name: string; taskCount: number;
  completedTaskCount: number; taskProgressPercent: number | null; actualHours: number; tasks: MandateTask[];
  isCurrentlyApplicable?: boolean };
export type MandateActivity = { id: string; label: string; status: string; duration: string;
  scheduledDate?: string | null; canonicalTypeMissing: boolean; planningStatus: string;
  lead?: { displayName: string; status: string } | null; taskCount: number; completedTaskCount: number;
  taskProgressPercent: number | null; actualHours: number; checklists: MandateTaskGroup[];
  linkedExistingLists: MandateTaskGroup[]; directTasks: MandateTask[];
  missingTaskLists: Array<{ taskListId: string; name: string }> };
export type MandateWorkView = { summary: { budgetHours: number | null; actualHours: number;
  plannedHours: number; budgetRemainingHours: number | null; unplannedRemainingHours: number | null };
  activities: MandateActivity[]; transversal: MandateTaskGroup; legacyLists: MandateTaskGroup[];
  classification: { activityTaskCount: number; legacyTaskCount: number; transversalTaskCount: number;
    totalTaskCount: number } };

function workError(cause: unknown) {
  const message = axios.isAxiosError(cause) ? cause.response?.data?.message : null;
  return typeof message === 'string' ? message : "Le travail du mandat n'a pas pu être chargé.";
}

export function useMandateWork(projectId: string) {
  const [data, setData] = useState<MandateWorkView | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setError('');
    setData(current => { if (current) setRefreshing(true); else setLoading(true); return current; });
    try {
      const response = await api.get<MandateWorkView>(`/projects/${projectId}/mandate/work`, {
        signal: nextController.signal,
      });
      if (request !== sequence.current || nextController.signal.aborted) return;
      setData(response.data);
    } catch (cause) {
      if (request !== sequence.current || nextController.signal.aborted) return;
      setError(workError(cause));
    } finally {
      if (request === sequence.current && !nextController.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [projectId]);

  useEffect(() => {
    // Project identity owns this read model; clear the previous project's data before its request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(null);
    setError('');
    setLoading(true);
    void load();
    return () => controller.current?.abort();
  }, [load]);

  return { data, loading, refreshing, error, refresh: load };
}
