import { BadRequestException } from '@nestjs/common';
import { validateAndHashIncidentReportContent } from './incident-report-content';

describe('validateAndHashIncidentReportContent', () => {
  it('produit une empreinte stable indépendamment de l’ordre des clés', () => {
    const schema = { requiredFields: ['summary'] };
    const first = validateAndHashIncidentReportContent(
      { summary: 'ok', nested: { b: 2, a: 1 } },
      schema,
    );
    const second = validateAndHashIncidentReportContent(
      { nested: { a: 1, b: 2 }, summary: 'ok' },
      schema,
    );
    expect(first).toEqual(second);
  });

  it('refuse les champs obligatoires absents et les clés de prototype', () => {
    expect(() =>
      validateAndHashIncidentReportContent({}, { requiredFields: ['summary'] }),
    ).toThrow(BadRequestException);
    const unsafe = JSON.parse(
      '{"summary":"ok","__proto__":{"admin":true}}',
    ) as unknown as Record<string, unknown>;
    expect(() => validateAndHashIncidentReportContent(unsafe, {})).toThrow(
      'Clé de formulaire interdite',
    );
  });
});
