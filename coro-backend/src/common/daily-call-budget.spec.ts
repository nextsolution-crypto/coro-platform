import { DailyCallBudget } from './daily-call-budget';

describe('plafond quotidien des appels IA (M9-05)', () => {
  afterEach(() => delete process.env.TEST_DAILY_CAP);

  it('bloque au-delà du plafond et repart le lendemain (heure de Toronto)', () => {
    let now = new Date('2026-11-21T15:00:00Z');
    process.env.TEST_DAILY_CAP = '2';
    const budget = new DailyCallBudget('test', 'TEST_DAILY_CAP', 100, () => now);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(true);
    expect(budget.tryConsume()).toBe(false);
    now = new Date('2026-11-22T04:59:00Z'); // encore le 21 à Toronto
    expect(budget.tryConsume()).toBe(false);
    now = new Date('2026-11-22T05:01:00Z'); // 22 nov. à Toronto
    expect(budget.tryConsume()).toBe(true);
  });
});
