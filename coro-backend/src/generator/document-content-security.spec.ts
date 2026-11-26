import { sanitizeDocumentContent } from './document-content-security';

describe('sanitizeDocumentContent', () => {
  it('removes stored-script vectors recursively while preserving approved formatting', () => {
    const value = sanitizeDocumentContent({
      title: '<strong>Plan</strong><script>globalThis.pwned=true</script>',
      nested: [
        {
          html: '<img src="x" onerror="alert(1)"><a href="javascript:alert(2)">bad</a>',
        },
      ],
    });

    expect(value.title).toBe('<strong>Plan</strong>');
    expect(value.nested[0].html).not.toMatch(/script|onerror|javascript:/i);
  });

  it('does not mutate the source snapshot', () => {
    const source = { content: '<script>alert(1)</script><p>safe</p>' };
    const value = sanitizeDocumentContent(source);
    expect(source.content).toContain('<script>');
    expect(value.content).toBe('<p>safe</p>');
  });

  it('keeps unknown and non-string values structurally intact', () => {
    expect(
      sanitizeDocumentContent({ count: 3, enabled: false, empty: null }),
    ).toEqual({ count: 3, enabled: false, empty: null });
  });
});

describe('sanitizeDocumentString — esperluette', () => {
  const { sanitizeDocumentString } = require('./document-content-security');
  it('garde « & » tel quel mais encode toujours < et >', () => {
    expect(sanitizeDocumentString('Circulation & routes')).toBe('Circulation & routes');
    expect(sanitizeDocumentString('a < b & c > d')).toBe('a &lt; b & c &gt; d');
    expect(sanitizeDocumentString('<script>alert(1)</script>Texte & suite')).toBe('Texte & suite');
    expect(sanitizeDocumentString('&lt;img src=x onerror=1&gt;')).toBe('&lt;img src=x onerror=1&gt;');
  });
});
