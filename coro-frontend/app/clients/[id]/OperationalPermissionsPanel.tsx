'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/lib/toast';
import { applyOperationalPermissionPreset, CORRECTIVE_ACTION_PERMISSIONS, OPERATIONAL_PERMISSION_PRESETS, REVIEW_PERMISSIONS, type CorrectiveActionPermission, type OperationalPermissionPreset, type ReviewPermission } from './operationalPermissionPresets';

interface ClientUserPermissions { id: string; email: string; firstName: string; lastName: string; role: string; isActive: boolean; buildingIds: string[]; operationalReviewPermissions: ReviewPermission[]; correctiveActionPermissions: CorrectiveActionPermission[]; }
const reviewLabels: Record<ReviewPermission, string> = { REX_CREATE: 'Créer un REX', REX_EDIT: 'Modifier un REX', REX_REVIEW: 'Réviser les constats et recommandations', REX_FINALIZE: 'Finaliser un REX' };
const correctiveLabels: Record<CorrectiveActionPermission, string> = { CORRECTIVE_ACTION_CREATE: 'Créer une action', CORRECTIVE_ACTION_EDIT: 'Modifier ou assigner une action', CORRECTIVE_ACTION_COMPLETE: 'Déclarer une action réalisée', CORRECTIVE_ACTION_VERIFY: 'Vérifier une réalisation', CORRECTIVE_ACTION_CLOSE: 'Fermer une action' };
const presetLabels: Record<OperationalPermissionPreset, string> = { READ_ONLY: 'Lecture seule', REX: 'REX', CORRECTIVE_ACTIONS: 'Actions correctives', VERIFICATION: 'Vérification', RESILIENCE_MANAGER: 'Responsable résilience' };

export default function OperationalPermissionsPanel({ clientId, endpointBase }: { clientId: string; endpointBase?: string }) {
  const [users, setUsers] = useState<ClientUserPermissions[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [review, setReview] = useState<ReviewPermission[]>([]);
  const [corrective, setCorrective] = useState<CorrectiveActionPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const basePath = endpointBase ?? `/clients/${clientId}`;
  useEffect(() => { api.get(`${basePath}/client-users`).then(({ data }) => { setUsers(data); if (data[0]) setSelectedId(data[0].id); }).catch(() => toast('Impossible de charger les comptes client.', 'error')).finally(() => setLoading(false)); }, [basePath]);
  useEffect(() => { const selected = users.find((item) => item.id === selectedId); if (selected) { setReview([...selected.operationalReviewPermissions]); setCorrective([...selected.correctiveActionPermissions]); } }, [selectedId, users]);

  const toggle = <T extends string>(value: T, current: T[], setCurrent: (next: T[]) => void) => setCurrent(current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const applyPreset = (preset: OperationalPermissionPreset) => { const next = applyOperationalPermissionPreset(preset); setReview(next.review); setCorrective(next.corrective); };
  const save = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const { data } = await api.put(`${basePath}/client-users/${selectedId}/operational-permissions`, { operationalReviewPermissions: review, correctiveActionPermissions: corrective });
      setUsers((current) => current.map((item) => item.id === selectedId ? { ...item, ...data } : item));
      toast('Permissions opérationnelles mises à jour.');
    } catch (error: any) {
      const message = error?.response?.data?.message ?? 'La mise à jour a échoué.';
      toast(Array.isArray(message) ? message[0] : message, 'error');
    } finally { setSaving(false); }
  };

  return <section className="rounded-md p-4 sm:p-6" style={{ background: '#FFFFFF', border: '1px solid #E9ECEF' }}>
    <div className="flex items-center gap-2 mb-2"><ShieldCheck size={19} color="#C0392B" /><h3 className="font-semibold" style={{ color: '#2C3E50' }}>Permissions opérationnelles</h3></div>
    <p className="text-xs mb-5" style={{ color: '#6C757D' }}>Les permissions sont individuelles. Elles s&apos;ajoutent aux accès client et bâtiments existants.</p>
    {loading ? <p className="text-sm">Chargement...</p> : users.length === 0 ? <p className="text-sm" style={{ color: '#6C757D' }}>Aucun compte client.</p> : <div className="space-y-5">
      <div><label className="block text-sm font-medium mb-1.5">Compte client</label><select className="w-full rounded px-3 py-2 text-sm" style={{ border: '1px solid #CED4DA' }} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{users.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName} · {item.email}{!item.isActive ? ' · Inactif' : ''}</option>)}</select></div>
      <div><p className="text-sm font-medium mb-2">Préréglages</p><div className="flex flex-wrap gap-2">{(Object.keys(OPERATIONAL_PERMISSION_PRESETS) as OperationalPermissionPreset[]).map((preset) => <button key={preset} type="button" onClick={() => applyPreset(preset)} className="rounded px-3 py-2 text-xs font-semibold" style={{ border: '1px solid #CED4DA', background: '#F8F9FA', color: '#2C3E50' }}>{presetLabels[preset]}</button>)}</div></div>
      <fieldset><legend className="text-sm font-semibold mb-2">Retour d&apos;expérience</legend><div className="grid sm:grid-cols-2 gap-2">{REVIEW_PERMISSIONS.map((permission) => <PermissionCheckbox key={permission} label={reviewLabels[permission]} checked={review.includes(permission)} onChange={() => toggle(permission, review, setReview)} />)}</div></fieldset>
      <fieldset><legend className="text-sm font-semibold mb-2">Actions correctives</legend><div className="grid sm:grid-cols-2 gap-2">{CORRECTIVE_ACTION_PERMISSIONS.map((permission) => <PermissionCheckbox key={permission} label={correctiveLabels[permission]} checked={corrective.includes(permission)} control={permission === 'CORRECTIVE_ACTION_VERIFY' || permission === 'CORRECTIVE_ACTION_CLOSE'} onChange={() => toggle(permission, corrective, setCorrective)} />)}</div></fieldset>
      <p className="rounded p-3 text-xs" style={{ background: '#FFF8E1', color: '#6D5200', border: '1px solid #F1D98A' }}>Vérifier et fermer sont des permissions de contrôle. CORO interdit l&apos;auto-vérification par le responsable de l&apos;action ou l&apos;acteur ayant déclaré sa réalisation.</p>
      <button type="button" onClick={() => void save()} disabled={saving} className="rounded px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: '#C0392B' }}>{saving ? 'Enregistrement...' : 'Enregistrer les permissions'}</button>
    </div>}
  </section>;
}

function PermissionCheckbox({ label, checked, onChange, control = false }: { label: string; checked: boolean; onChange: () => void; control?: boolean }) {
  return <label className="flex items-start gap-2 rounded p-3 text-sm" style={{ border: `1px solid ${control ? '#E6C75A' : '#E9ECEF'}`, background: control ? '#FFFCED' : '#FFFFFF' }}><input type="checkbox" checked={checked} onChange={onChange} className="mt-0.5" /><span>{label}{control && <small className="block mt-1 font-semibold" style={{ color: '#806600' }}>Permission de contrôle</small>}</span></label>;
}
