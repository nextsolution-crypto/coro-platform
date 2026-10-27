import { PublicAssistantConfig } from './public-assistant.config';
import { PublicAssistantSessionService } from './public-assistant-session.service';

describe('PublicAssistantSessionService', () => {
  function service(overrides: Partial<PublicAssistantConfig> = {}) {
    return new PublicAssistantSessionService({
      maxHistoryTurns: 4,
      maxSessionCharacters: 120,
      sessionTtlMs: 1_000,
      ...overrides,
    } as PublicAssistantConfig);
  }

  it('bounds history by turn count, individual content and total characters', () => {
    const sessions = service();
    const opened = sessions.open();
    sessions.append(
      opened.id,
      { role: 'user', content: 'a'.repeat(2_500) },
      { role: 'assistant', content: 'b'.repeat(60) },
      { role: 'user', content: 'c'.repeat(60) },
      { role: 'assistant', content: 'd'.repeat(60) },
      { role: 'user', content: 'e'.repeat(60) },
    );

    const resumed = sessions.open(opened.id);
    expect(resumed.history).toHaveLength(2);
    expect(resumed.history.map((turn) => turn.content)).toEqual([
      'd'.repeat(60),
      'e'.repeat(60),
    ]);
  });

  it('expires anonymous sessions and never trusts an unknown supplied id', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-27T12:00:00Z'));
    const sessions = service({ sessionTtlMs: 100 });
    const opened = sessions.open('attacker-selected-session');
    expect(opened.id).not.toBe('attacker-selected-session');
    sessions.append(opened.id, { role: 'user', content: 'public question' });

    jest.advanceTimersByTime(101);
    const expired = sessions.open(opened.id);
    expect(expired.id).not.toBe(opened.id);
    expect(expired.history).toEqual([]);
    jest.useRealTimers();
  });

  it('clears a conversation explicitly', () => {
    const sessions = service();
    const opened = sessions.open();
    sessions.append(opened.id, { role: 'user', content: 'public question' });
    sessions.clear(opened.id);
    const replacement = sessions.open(opened.id);
    expect(replacement.id).not.toBe(opened.id);
    expect(replacement.history).toEqual([]);
  });
});
