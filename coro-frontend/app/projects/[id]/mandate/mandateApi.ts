import api from '@/lib/api';
import type { MandateServiceServer } from './mandateCommercialState';
import type { ApplyDecision } from './mandateOperationalState';

export type MandateServicesResponse = { revision: string; services: MandateServiceServer[] };

export const getMandateServices = async (projectId: string, signal?: AbortSignal) =>
  (await api.get<MandateServicesResponse>(`/projects/${projectId}/mandate/services`, { signal })).data;

export const putMandateServices = async (projectId: string, payload: unknown, signal?: AbortSignal) =>
  (await api.put<MandateServicesResponse>(`/projects/${projectId}/mandate/services`, payload, { signal })).data;

export const previewMandateOperations = async (projectId: string, expectedRevision: string, signal?: AbortSignal) =>
  (await api.post(`/projects/${projectId}/mandate/services/operations/preview`, { expectedRevision }, { signal })).data;

export const applyMandateOperations = async (projectId: string, payload: {
  idempotencyKey: string; expectedRevision: string; decisions: ApplyDecision[];
}, signal?: AbortSignal) =>
  (await api.post(`/projects/${projectId}/mandate/services/operations/apply`, payload, { signal })).data;
