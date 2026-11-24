import { addBusinessMinutes, firstResponseDueAt, supportPriority, supportQueue, ticketReference } from './support-sla';

// Heure de Montréal en novembre : UTC−5.
const mtl = (iso: string) => new Date(`${iso}-05:00`);

describe('Centre d’aide : délais ouvrables, priorité, routage', () => {
  it('bloquant : 4 h ouvrables, en sautant la nuit', () => {
    expect(firstResponseDueAt(1, mtl('2026-11-24T10:00:00')).toISOString()).toBe(mtl('2026-11-24T14:00:00').toISOString());
    // Lundi 15 h 00 → 2 h le jour même (jusqu'à 17 h), 2 h le lendemain à partir de 8 h 30.
    expect(firstResponseDueAt(1, mtl('2026-11-23T15:00:00')).toISOString()).toBe(mtl('2026-11-24T10:30:00').toISOString());
  });

  it('gênant : 1 jour ouvrable ; vendredi soir → lundi', () => {
    expect(firstResponseDueAt(2, mtl('2026-11-27T18:00:00')).toISOString()).toBe(mtl('2026-11-30T17:00:00').toISOString());
  });

  it('mineur : 3 jours ouvrables, la fin de semaine ne compte pas', () => {
    expect(firstResponseDueAt(3, mtl('2026-11-27T09:00:00')).toISOString()).toBe(mtl('2026-12-02T09:00:00').toISOString());
  });

  it('une suggestion n’est jamais urgente', () => {
    expect(supportPriority('SUGGESTION', 'BLOCKING')).toBe(3);
    expect(supportPriority('BUG', 'BLOCKING')).toBe(1);
    expect(supportPriority('ACCESS', 'DISRUPTIVE')).toBe(2);
  });

  it('routage : la question d’un client va à sa firme-conseil, le reste à CORO', () => {
    expect(supportQueue('CLIENT_PORTAL', 'QUESTION')).toBe('ADVISOR');
    expect(supportQueue('CLIENT_PORTAL', 'BUG')).toBe('CORO');
    expect(supportQueue('CLIENT_PORTAL', 'SUGGESTION')).toBe('CORO');
    expect(supportQueue('CLIENT_PORTAL', 'ACCESS')).toBe('CORO');
    expect(supportQueue('ADVISOR_APP', 'QUESTION')).toBe('CORO');
  });

  it('référence lisible', () => {
    expect(ticketReference(7)).toBe('CORO-0007');
    expect(ticketReference(12345)).toBe('CORO-12345');
    expect(addBusinessMinutes(mtl('2026-11-28T12:00:00'), 0).getTime()).toBe(mtl('2026-11-28T12:00:00').getTime());
  });
});
