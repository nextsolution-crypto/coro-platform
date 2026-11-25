import { templateIssues, toTemplateContent } from './procedure-template';
import { buildCorrectionPrompt, buildProcedurePrompt, parseJsonAnswer } from './procedure-prompt';

describe('toTemplateContent', () => {
  it('convertit une ancienne procédure IA (liste d’actions) au gabarit', () => {
    const out = toTemplateContent(
      {
        titleFR: 'Fuite d’eau',
        titleEN: 'Water leak',
        color: '#E67E22',
        roleSections: [
          {
            roleCode: 'ROLE-RM',
            roleName: 'Responsable mécanique',
            roleNameEN: 'Mechanical supervisor',
            actions: ['Couper l’alimentation en eau', 'Informer le coordonnateur'],
            actionsEN: ['Shut off the water supply', 'Inform the coordinator'],
          },
        ],
      },
      { code: 'CP004' },
    );
    expect(out.titleFR).toBe('FUITE D’EAU');
    expect(out.roleSections[0]).toMatchObject({
      roleCode: 'ROLE-RM',
      roleLabelFR: 'Responsable mécanique',
      steps: [
        { textFR: '**Coupez** l’alimentation en eau', textEN: 'Shut off the water supply', isBold: true },
        { textFR: '**Informez** le coordonnateur', textEN: 'Inform the coordinator', isBold: true },
      ],
    });
    expect(out.roleSections[0].steps[0].id).toBe('CP004_r1_1');
  });

  it('garde les sous-étapes, le rouge et les encadrés', () => {
    const out = toTemplateContent({
      titleFR: 'X',
      titleEN: 'X',
      roleSections: [
        {
          roleCode: 'ROLE-CU',
          roleLabelFR: "Coordonnateur d'urgence",
          roleLabelEN: 'Emergency Coordinator',
          steps: [{ textFR: 'Appeler le 9-1-1 et fournir :', textEN: 'Call 9-1-1 and provide:', isRed: true, subSteps: [{ textFR: 'Adresse ;', textEN: 'Address;' }] }],
        },
      ],
      importantBoxes: [{ type: 'IMPORTANT', text: 'Ne touchez à rien.', textEN: 'Touch nothing.' }],
    });
    const step = out.roleSections[0].steps[0];
    expect(step.textFR).toBe('**Appelez** le 9-1-1 et fournissez :');
    expect(step.isRed).toBe(true);
    expect(step.subSteps?.[0]).toMatchObject({ textFR: 'Adresse ;', isList: true });
    expect(out.importantBoxes).toEqual([{ type: 'IMPORTANT', text: 'Ne touchez à rien.', textEN: 'Touch nothing.' }]);
  });

  it('signale traduction manquante et rôle hors organigramme', () => {
    const out = toTemplateContent({
      titleFR: 'X',
      titleEN: 'X',
      roleSections: [{ roleCode: 'ROLE-ZZZ', roleLabelFR: 'Inconnu', steps: [{ textFR: 'Vérifiez la porte' }] }],
    });
    const problems = templateIssues(out, ['ROLE-CU']).map((i) => i.problem);
    expect(problems.some((p) => p.includes('ROLE-ZZZ'))).toBe(true);
    expect(problems).toContain('traduction anglaise manquante');
  });
});

describe('consignes à l’IA', () => {
  const roles = [{ code: 'ROLE-CU', labelFR: "Coordonnateur d'urgence", labelEN: 'Emergency Coordinator' }];

  it('donne les rôles du projet et le style de la bibliothèque', () => {
    const prompt = buildProcedurePrompt('Texte source', roles);
    expect(prompt).toContain("ROLE-CU = Coordonnateur d'urgence");
    expect(prompt).toContain('vouvoiement impératif');
    expect(prompt).toContain('Ne perds aucune information');
    expect(prompt).toContain('Texte source');
  });

  it('demande la correction des écarts relevés', () => {
    const prompt = buildCorrectionPrompt({ titleFR: 'X' }, [{ where: 'CU, étape 1', problem: 'verbe à l’infinitif' }], roles);
    expect(prompt).toContain('CU, étape 1 : verbe à l’infinitif');
  });

  it('lit une réponse JSON entourée de texte ou de ```', () => {
    expect(parseJsonAnswer('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonAnswer('Voici : {"a":{"b":2}} merci')).toEqual({ a: { b: 2 } });
    expect(() => parseJsonAnswer('rien')).toThrow();
  });
});
