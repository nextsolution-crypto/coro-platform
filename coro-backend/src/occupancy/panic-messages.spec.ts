import { buildPanicMessage, callerPolicy, effectiveScope, panicResponsesFor } from './panic-messages';

const base = {
  buildingName: 'Tour QA',
  address: '1200 boul. Robert-Bourassa, Montréal',
  triggeredBy: 'Martin Gagnon',
  time: '09 h 42',
  coordinatorName: 'Julie Roy',
  responseUrl: 'https://client.getcoro.io/alerte/abc',
};

describe('Panic messages (audit M2-05)', () => {
  it('threat: get out or hide, no fire alarm, no assembly point, silent by default', () => {
    const m = buildPanicMessage({ ...base, type: 'THREAT', scope: 'TEAM', audience: 'TEAM' });
    expect(m.sms).toContain('CORO – Tour QA, 1200 boul. Robert-Bourassa');
    expect(m.sms).toContain('Alerte : MENACE OU VIOLENCE, à 09 h 42, déclenchée par Martin Gagnon.');
    expect(m.sms).toContain('FUYEZ');
    expect(m.sms).toContain('CACHEZ-VOUS');
    expect(m.sms).toContain('n’allez pas au point de rassemblement');
    expect(m.sms).toContain('Ne déclenchez pas l’alarme incendie');
    expect(m.sms).toContain('Alerte silencieuse');
    expect(m.sms).toContain('Julie Roy (coordonnateur) confirme');
    expect(m.sms).toContain('Répondez : https://client.getcoro.io/alerte/abc');
    expect(m.sms).toContain('GET OUT');
  });

  it('threat to occupants: protective action and 911 once safe, no trigger name', () => {
    const m = buildPanicMessage({ ...base, type: 'THREAT', scope: 'BUILDING', audience: 'OCCUPANT' });
    expect(m.sms).toContain('Composez le 911 une fois en sécurité');
    expect(m.sms).not.toContain('Martin Gagnon');
    expect(m.sms).not.toContain('Alerte silencieuse');
  });

  it('fire: pull the alarm, stairs, assembly point — the opposite of a threat', () => {
    const m = buildPanicMessage({ ...base, type: 'FIRE', scope: 'TEAM', audience: 'TEAM' });
    expect(m.sms).toContain('Déclenchez l’alarme incendie');
    expect(m.sms).toContain('point de rassemblement');
    expect(m.sms).not.toContain('FUYEZ');
  });

  it('medical: first aiders with kit and AED', () => {
    expect(buildPanicMessage({ ...base, type: 'MEDICAL', scope: 'TEAM', audience: 'TEAM' }).sms).toContain('DEA');
  });

  it('only a threat may alert the whole building', () => {
    expect(effectiveScope('THREAT', 'BUILDING')).toBe('BUILDING');
    expect(effectiveScope('FIRE', 'BUILDING')).toBe('TEAM');
    expect(effectiveScope('THREAT', undefined)).toBe('TEAM');
  });

  it('caller policy names one caller and one confirmer', () => {
    expect(callerPolicy('A', null).fr).toContain('911 : A appelle');
    expect(callerPolicy('A', 'B').fr).toContain('B (coordonnateur) confirme');
  });

  it('team members can take charge, occupants answer safe or need help', () => {
    expect(panicResponsesFor('TEAM')).toEqual(['TAKING_CHARGE', 'SAFE', 'NEED_HELP']);
    expect(panicResponsesFor('OCCUPANT')).toEqual(['SAFE', 'NEED_HELP']);
  });

  it('escapes names in the email', () => {
    const m = buildPanicMessage({ ...base, triggeredBy: '<script>x</script>', type: 'OTHER', scope: 'TEAM', audience: 'TEAM' });
    expect(m.html).not.toContain('<script>x');
  });
});
