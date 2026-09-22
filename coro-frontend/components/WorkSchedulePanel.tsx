'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

type Slot = { dayOfWeek: number; startTime: number; endTime: number };
type Schedule = { id: string; timeZone: string; effectiveFrom: string; verifiedAt: string; intervals: Slot[] };
type Absence = { id: string; startAt: string; endAt: string; timeZone: string; type: string; privateNote?: string | null; cancelledAt?: string | null };
type Current = { timeZone: string; timeZoneVerified: boolean; schedule: Schedule | null };
const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const kinds = ['VACATION', 'SICK', 'TRAINING', 'TRAVEL', 'ADMIN_BLOCK', 'PERSONAL', 'OTHER'];
const toClock = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const fromClock = (clock: string) => { const [hours, minutes] = clock.split(':').map(Number); return hours * 60 + minutes; };

export default function WorkSchedulePanel({ userId, manager }: { userId?: string; manager: boolean }) {
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<Schedule[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [timeZone, setTimeZone] = useState('America/Toronto');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [absence, setAbsence] = useState({ type: 'VACATION', allDay: false, startAt: '', endAt: '', localStartDate: '', localEndDate: '', privateNote: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const base = userId ? `/work-schedules/users/${userId}` : '/work-schedules/me';

  const refresh = useCallback(async () => {
    try {
      const [schedule, list] = await Promise.all([api.get(base), api.get(`${base}/unavailabilities`)]);
      setCurrent(schedule.data);
      setSlots(schedule.data.schedule?.intervals.map((slot: Slot) => ({ dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime })) ?? []);
      setTimeZone(schedule.data.timeZone);
      setAbsences(list.data);
      if (manager && userId) setHistory((await api.get(`${base}/history`)).data);
    } catch (err: any) { setError(err?.response?.data?.message || 'Chargement impossible'); }
  }, [base, manager, userId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const saveZone = async () => {
    if (!userId) return;
    setBusy(true); setError('');
    try { await api.put(`/users/organization/${userId}/time-zone`, { timeZone }); await refresh(); setMessage('Fuseau vérifié.'); }
    catch (err: any) { setError(err?.response?.data?.message || 'Fuseau invalide'); }
    finally { setBusy(false); }
  };
  const saveSchedule = async () => {
    if (!userId) return;
    setBusy(true); setError('');
    try { await api.post(base, { effectiveFrom, intervals: slots }); await refresh(); setMessage('Nouvelle version vérifiée.'); }
    catch (err: any) { setError(err?.response?.data?.message || 'Horaire invalide'); }
    finally { setBusy(false); }
  };
  const saveAbsence = async () => {
    setBusy(true); setError('');
    try {
      const body = absence.allDay ? { type: absence.type, allDay: true, timeZone,
        localStartDate: absence.localStartDate, localEndDate: absence.localEndDate, privateNote: absence.privateNote } :
        { type: absence.type, allDay: false, timeZone, startAt: new Date(absence.startAt).toISOString(),
          endAt: new Date(absence.endAt).toISOString(), privateNote: absence.privateNote };
      await api.post(`${base}/unavailabilities`, body);
      await refresh(); setMessage('Indisponibilité enregistrée.');
    } catch (err: any) { setError(err?.response?.data?.message || 'Indisponibilité invalide'); }
    finally { setBusy(false); }
  };
  const cancelAbsence = async (id: string) => {
    setBusy(true); setError('');
    try { await api.delete(`/work-schedules/unavailabilities/${id}`); await refresh(); setMessage('Indisponibilité annulée.'); }
    catch (err: any) { setError(err?.response?.data?.message || 'Annulation impossible'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-md bg-white border border-gray-200 p-4 space-y-5">
    <h3 className="font-semibold text-lg">Horaire et indisponibilités</h3>
    {error && <p role="alert" className="text-red-700 text-sm">{String(error)}</p>}
    {message && <p role="status" className="text-green-700 text-sm">{message}</p>}
    {current && <div className="text-sm space-y-1">
      <p>Fuseau : {current.timeZone} — {current.timeZoneVerified ? 'vérifié' : 'à vérifier'}</p>
      <p>Horaire : {current.schedule ? `vérifié depuis le ${new Date(current.schedule.effectiveFrom).toLocaleDateString('fr-CA', { timeZone: current.schedule.timeZone })}` : 'non configuré'}</p>
      {current.schedule && current.schedule.intervals.map((slot, index) => <p key={index}>{days[slot.dayOfWeek]} : {toClock(slot.startTime)}–{toClock(slot.endTime)}</p>)}
    </div>}
    {manager && userId && <div className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Configurer une nouvelle version</h4>
      <label className="block text-sm">Fuseau IANA <input className="border rounded p-2 ml-2" value={timeZone} onChange={e => setTimeZone(e.target.value)} /></label>
      <button disabled={busy} className="border rounded px-3 py-2 text-sm" onClick={saveZone}>Vérifier le fuseau</button>
      <label className="block text-sm">Date d’effet <input className="border rounded p-2 ml-2" type="date" value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} /></label>
      {slots.map((slot, index) => <div key={index} className="flex flex-wrap gap-2 items-center text-sm">
        <select className="border p-2" value={slot.dayOfWeek} onChange={e => setSlots(slots.map((item, i) => i === index ? { ...item, dayOfWeek: Number(e.target.value) } : item))}>{days.map((day, i) => <option key={day} value={i}>{day}</option>)}</select>
        <input aria-label="Début" type="time" className="border p-2" value={toClock(slot.startTime)} onChange={e => setSlots(slots.map((item, i) => i === index ? { ...item, startTime: fromClock(e.target.value) } : item))} />
        <input aria-label="Fin" type="time" className="border p-2" disabled={slot.endTime === 1440} value={slot.endTime === 1440 ? '00:00' : toClock(slot.endTime)} onChange={e => setSlots(slots.map((item, i) => i === index ? { ...item, endTime: fromClock(e.target.value) } : item))} />
        <label><input type="checkbox" checked={slot.endTime === 1440} onChange={e => setSlots(slots.map((item, i) => i === index ? { ...item, endTime: e.target.checked ? 1440 : 1439 } : item))} /> Fin à minuit</label>
        <button className="underline" onClick={() => setSlots(slots.filter((_, i) => i !== index))}>Retirer</button>
      </div>)}
      <button className="border rounded px-3 py-2 text-sm" onClick={() => setSlots([...slots, { dayOfWeek: 1, startTime: 540, endTime: 1020 }])}>Ajouter une plage</button>
      <button disabled={busy || !current?.timeZoneVerified || timeZone !== current.timeZone} className="bg-blue-700 text-white rounded px-3 py-2 text-sm ml-2 disabled:opacity-50" onClick={saveSchedule}>Vérifier et enregistrer</button>
      {current && timeZone !== current.timeZone && <p className="text-xs text-amber-800">Vérifiez d’abord le nouveau fuseau.</p>}
      {history.length > 0 && <p className="text-xs text-gray-600">{history.length} version(s) conservée(s) dans l’historique.</p>}
    </div>}
    <div className="space-y-3 border-t pt-4">
      <h4 className="font-medium">Indisponibilités</h4>
      {absences.filter(item => !item.cancelledAt).map(item => <div key={item.id} className="flex flex-wrap gap-2 text-sm items-center">
        <span>{item.type} : {new Date(item.startAt).toLocaleString('fr-CA', { timeZone: item.timeZone })} – {new Date(item.endAt).toLocaleString('fr-CA', { timeZone: item.timeZone })}</span>
        <button className="underline" disabled={busy} onClick={() => cancelAbsence(item.id)}>Annuler</button>
      </div>)}
      <label className="block text-sm">Type <select className="border p-2 ml-2" value={absence.type} onChange={e => setAbsence({ ...absence, type: e.target.value })}>{kinds.map(kind => <option key={kind}>{kind}</option>)}</select></label>
      <label className="block text-sm">Fuseau de l’indisponibilité <input className="border p-2 ml-2" value={timeZone} onChange={e => setTimeZone(e.target.value)} /></label>
      <label className="block text-sm"><input type="checkbox" checked={absence.allDay} onChange={e => setAbsence({ ...absence, allDay: e.target.checked })} /> Journée entière</label>
      {absence.allDay ? <div className="flex gap-2 text-sm"><label>Début <input className="border p-2" type="date" value={absence.localStartDate} onChange={e => setAbsence({ ...absence, localStartDate: e.target.value })} /></label><label>Fin exclusive <input className="border p-2" type="date" value={absence.localEndDate} onChange={e => setAbsence({ ...absence, localEndDate: e.target.value })} /></label></div> :
        <div className="flex gap-2 text-sm"><label>Début <input className="border p-2" type="datetime-local" value={absence.startAt} onChange={e => setAbsence({ ...absence, startAt: e.target.value })} /></label><label>Fin <input className="border p-2" type="datetime-local" value={absence.endAt} onChange={e => setAbsence({ ...absence, endAt: e.target.value })} /></label></div>}
      <p className="text-xs text-gray-600">Les heures ponctuelles utilisent le fuseau de votre appareil. Les journées entières utilisent le fuseau affiché ci-dessus.</p>
      <label className="block text-sm">Note privée <input className="border p-2 ml-2" maxLength={2000} value={absence.privateNote} onChange={e => setAbsence({ ...absence, privateNote: e.target.value })} /></label>
      <button disabled={busy} className="bg-blue-700 text-white rounded px-3 py-2 text-sm" onClick={saveAbsence}>Ajouter l’indisponibilité</button>
    </div>
  </section>;
}
