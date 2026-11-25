import { keepManualEdits, resolveActiveRoleCodes } from './regeneration.helpers';

describe('resolveActiveRoleCodes', () => {
  const chart = [
    { roleCode: 'ROLE-CU', isActive: true },
    { roleCode: 'ROLE-EPI', isActive: false },
    { roleCode: 'ROLE-SS', isActive: true },
  ];

  it('ajoute l’agent de sécurité quand la configuration en prévoit un', () => {
    expect(resolveActiveRoleCodes(chart, { agentSecurite: true })).toEqual([
      'ROLE-AS',
      'ROLE-CU',
      'ROLE-SS',
    ]);
    expect(resolveActiveRoleCodes(chart, { securite24h: true })).toContain('ROLE-AS');
  });

  it('n’ajoute pas l’agent de sécurité sans agent configuré', () => {
    expect(resolveActiveRoleCodes(chart, {})).toEqual(['ROLE-CU', 'ROLE-SS']);
    expect(
      resolveActiveRoleCodes([{ roleCode: 'ROLE-AS', isActive: true }, ...chart], {}),
    ).not.toContain('ROLE-AS');
  });

  it('donne le même résultat à la première génération et aux suivantes', () => {
    const config = { agentSecurite: true };
    const first = resolveActiveRoleCodes([], config);
    expect(first).toContain('ROLE-AS');
    expect(first).toContain('ROLE-CU');
    const chartFromDefaults = first
      .filter((code) => code !== 'ROLE-AS')
      .map((roleCode) => ({ roleCode, isActive: true }));
    expect(resolveActiveRoleCodes(chartFromDefaults, config)).toEqual(first);
  });
});

describe('keepManualEdits', () => {
  const generated = [
    {
      moduleNumber: 1,
      sections: [
        { id: '1.1', content: 'nouveau 1.1' },
        { id: '1.2', content: 'nouveau 1.2' },
      ],
    },
    { moduleNumber: 4, procedures: [{ id: 'p003' }] },
  ];

  it('garde le texte modifié à la main et régénère le reste', () => {
    const previous = [
      {
        moduleNumber: 1,
        sections: [
          { id: '1.1', content: 'mon texte', manuallyEdited: true, manuallyEditedAt: '2026-11-25T10:00:00.000Z' },
          { id: '1.2', content: 'ancien 1.2' },
        ],
      },
    ];
    const merged = keepManualEdits(generated, previous);
    expect(merged[0].sections[0]).toEqual({
      id: '1.1',
      content: 'mon texte',
      manuallyEdited: true,
      manuallyEditedAt: '2026-11-25T10:00:00.000Z',
    });
    expect(merged[0].sections[1].content).toBe('nouveau 1.2');
    expect(merged[1]).toBe(generated[1]);
  });

  it('ne fait rien à la première génération', () => {
    expect(keepManualEdits(generated, undefined)).toBe(generated);
  });
});
