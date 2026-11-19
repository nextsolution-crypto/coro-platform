import { BadRequestException } from '@nestjs/common';
import {
  INCIDENT_REPORT_FIELD_TYPES,
  INITIAL_INCIDENT_REPORT_TEMPLATES,
  validateFormContent,
  validateFormSchema,
} from './incident-report-form-engine';

describe('Incident report form engine', () => {
  it('exposes the complete governed field catalog and twelve real-estate templates', () => {
    expect(INCIDENT_REPORT_FIELD_TYPES).toHaveLength(22);
    expect(INITIAL_INCIDENT_REPORT_TEMPLATES).toHaveLength(12);
    expect(
      new Set(INITIAL_INCIDENT_REPORT_TEMPLATES.map((item) => item.templateKey))
        .size,
    ).toBe(12);
    for (const template of INITIAL_INCIDENT_REPORT_TEMPLATES)
      expect(validateFormSchema(template.formSchema)).toEqual(
        template.formSchema,
      );
  });
  it('evaluates composed 1.1 conditions and typed constraints server-side', () => {
    const schema = {
      schemaVersion: '1.1' as const,
      sections: [
        {
          key: 'main',
          title: 'Main',
          fields: [
            {
              key: 'priority',
              label: 'Priority',
              type: 'SELECT' as const,
              options: [
                { value: 'LOW', label: 'Low' },
                { value: 'HIGH', label: 'High' },
              ],
            },
            { key: 'external', label: 'External', type: 'CHECKBOX' as const },
            {
              key: 'details',
              label: 'Details',
              type: 'LONG_TEXT' as const,
              required: true,
              constraints: { minLength: 5, maxLength: 20 },
              visibleWhen: {
                all: [
                  {
                    fieldKey: 'external',
                    operator: 'EQ' as const,
                    value: true,
                  },
                  {
                    not: {
                      fieldKey: 'priority',
                      operator: 'EQ' as const,
                      value: 'LOW',
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(
      validateFormContent(schema, { priority: 'LOW', external: true }),
    ).toBeTruthy();
    expect(() =>
      validateFormContent(schema, {
        priority: 'HIGH',
        external: true,
        details: 'no',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateFormContent(schema, { priority: 'UNKNOWN', external: false }),
    ).toThrow(BadRequestException);
  });
  it('validates conditional and repeatable fields without exposing irrelevant fields', () => {
    const schema = {
      schemaVersion: '1.0' as const,
      sections: [
        {
          key: 'main',
          title: 'Main',
          fields: [
            { key: 'hasWitness', label: 'Témoin', type: 'CHECKBOX' as const },
            {
              key: 'witnesses',
              label: 'Témoins',
              type: 'REPEATABLE_SECTION' as const,
              required: true,
              visibleWhen: {
                fieldKey: 'hasWitness',
                operator: 'EQ' as const,
                value: true,
              },
              children: [
                {
                  key: 'name',
                  label: 'Nom',
                  type: 'SHORT_TEXT' as const,
                  required: true,
                },
              ],
            },
          ],
        },
      ],
    };
    expect(validateFormContent(schema, { hasWitness: false })).toEqual({
      hasWitness: false,
    });
    expect(() =>
      validateFormContent(schema, { hasWitness: true, witnesses: [{}] }),
    ).toThrow(BadRequestException);
    expect(
      validateFormContent(schema, {
        hasWitness: true,
        witnesses: [{ name: 'Témoin QA' }],
      }),
    ).toBeTruthy();
  });
  it('rejects duplicate keys and excessive repeatable sections', () => {
    expect(() =>
      validateFormSchema({
        schemaVersion: '1.0',
        sections: [
          {
            key: 'a',
            title: 'A',
            fields: [
              { key: 'x', label: 'X', type: 'SHORT_TEXT' },
              { key: 'x', label: 'X2', type: 'SHORT_TEXT' },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateFormSchema({
        schemaVersion: '1.1',
        sections: [
          {
            key: 'a',
            title: 'A',
            fields: [
              {
                key: 'x',
                label: 'X',
                type: 'SHORT_TEXT',
                visibleWhen: {
                  fieldKey: 'unknown',
                  operator: 'EQ',
                  value: true,
                },
              },
            ],
          },
        ],
      }),
    ).toThrow(BadRequestException);
  });
});
