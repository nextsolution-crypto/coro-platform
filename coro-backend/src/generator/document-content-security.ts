import sanitizeHtml from 'sanitize-html';

const POLICY: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'pre',
    'code',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'a',
    'img',
    'span',
    'div',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan', 'scope'],
    td: ['colspan', 'rowspan'],
    '*': ['lang', 'dir'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  enforceHtmlBoundary: true,
  transformTags: {
    a: (_tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
      },
    }),
  },
};

export function sanitizeDocumentString(value: string): string {
  return sanitizeHtml(value, POLICY);
}

/**
 * Historical content is sanitized on every read without rewriting the source.
 * New and restored content is sanitized before persistence.
 */
export function sanitizeDocumentContent<T>(value: T): T {
  if (typeof value === 'string') return sanitizeDocumentString(value) as T;
  if (Array.isArray(value)) {
    const entries: unknown[] = value;
    return entries.map((item) => sanitizeDocumentContent(item)) as T;
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeDocumentContent(entry),
      ]),
    ) as T;
  }
  return value;
}

export const DOCUMENT_CONTENT_POLICY = Object.freeze({
  allowedTags: [...(POLICY.allowedTags || [])],
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
});
