import { generateLastPage, hasLastPageContent } from './cover.template';

describe('last page template', () => {
  const base = { year: 2026, language: 'fr' as const };

  it('omits the decorative last page when issuer content is absent', () => {
    expect(hasLastPageContent(base)).toBe(false);
    expect(generateLastPage(base)).toBeNull();
  });

  it('omits whitespace-only issuer content', () => {
    const data = { ...base, companyName: '  ', companyEmail: '\n' };

    expect(hasLastPageContent(data)).toBe(false);
    expect(generateLastPage(data)).toBeNull();
  });

  it('preserves the governed last page when meaningful issuer content exists', () => {
    const data = { ...base, companyName: 'CORO QA' };
    const html = generateLastPage(data);

    expect(hasLastPageContent(data)).toBe(true);
    expect(html).toContain('CORO QA');
    expect(html).toContain('Tous droits');
  });
});
