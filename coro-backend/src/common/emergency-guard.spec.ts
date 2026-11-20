import { emergencyReply, isLiveEmergency } from './emergency-guard';

describe('isLiveEmergency (T6)', () => {
  it.each([
    'Au feu!',
    "Il y a un feu dans la cuisine",
    'y a de la fumée au 3e étage',
    'ça sent le gaz dans le sous-sol',
    "Mon collègue ne respire plus",
    "quelqu'un s'est effondré à la réception",
    'Il y a un tireur actif dans le bâtiment',
    "Un homme avec un couteau à l'entrée",
    'je veux me suicider',
    'au secours',
    "There's a fire in the warehouse",
    'someone collapsed and is unresponsive',
    'Active shooter on floor 2',
    'I want to kill myself',
    'HELP!',
    'urgence en cours',
  ])('detects a live emergency: %s', (message) => {
    expect(isLiveEmergency(message)).toBe(true);
  });

  it.each([
    'Comment rédiger une procédure incendie ?',
    "Qu'est-ce qu'un plan de mesures d'urgence ?",
    'Quelle est la différence entre PMU et PSI ?',
    "Combien coûte un exercice d'évacuation ?",
    'How do I write a fire safety plan?',
    'What should our gas leak procedure contain?',
    'Je veux un plan de continuité',
    'Who is the emergency coordinator for building A?',
    'help me understand the REX report',
    '',
  ])('does not trigger on a preparedness question: %s', (message) => {
    expect(isLiveEmergency(message)).toBe(false);
  });

  it('always tells the user to call 911 and 9-8-8, in the requested language', () => {
    expect(emergencyReply('fr')).toMatch(/composez le 911/);
    expect(emergencyReply('en')).toMatch(/call 911/);
    expect(emergencyReply('fr-CA')).toMatch(/composez le 911/);
    expect(emergencyReply('en-CA')).toMatch(/call 911/);
    const both = emergencyReply();
    expect(both).toMatch(/911/);
    expect(both).toMatch(/9-8-8/);
    expect(both).toMatch(/composez/);
    expect(both).toMatch(/call 911/);
  });
});
