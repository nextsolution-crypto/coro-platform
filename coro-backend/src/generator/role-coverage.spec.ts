import { applyRoleCoverage, findUncoveredRoles, sanitizeAssignments } from './role-coverage';
import { roleLabel, sentenceCase } from './role-registry';
import { resolveActiveRoleCodes } from './regeneration.helpers';
import { getActiveProcedures, getAllProcedures } from './procedures/index';

const step = (id: string) => ({ id, textFR: id, textEN: id });

const procedure = {
  id: 'p003',
  code: 'P003',
  titleFR: 'ALERTE',
  roleSections: [
    { roleCode: 'ROLE-CU', roleLabelFR: "Coordonnateur d'urgence", roleLabelEN: 'Emergency Coordinator', steps: [step('cu1')] },
    { roleCode: 'ROLE-EPI', roleLabelFR: 'Équipe de première intervention', roleLabelEN: 'First Response Team', steps: [step('epi1'), step('epi2')] },
    { roleCode: 'ROLE-RM', roleLabelFR: 'Responsable de la maintenance', roleLabelEN: 'Maintenance Supervisor', steps: [step('rm1')] },
    { roleCode: 'ROLE-CU', roleLabelFR: "Personne qui constate l'incident", roleLabelEN: 'Person who notices', steps: [step('witness')] },
    { roleCode: 'ROLE-OCC', roleLabelFR: 'Occupants / Travailleurs', roleLabelEN: 'Occupants / Workers', steps: [step('occ')] },
  ],
};

describe('applyRoleCoverage', () => {
  it('garde les rôles actifs sous leur nom unique', () => {
    const out = applyRoleCoverage(procedure, ['ROLE-CU', 'ROLE-RM']);
    const rm = out.roleSections.find((s: any) => s.roleCode === 'ROLE-RM')!;
    expect(rm.roleLabelFR).toBe('Responsable mécanique du bâtiment');
    expect(rm.roleLabelEN).toBe('Building Mechanical Supervisor');
  });

  it('adresse à tous une section qui décrit une situation, pas un rôle', () => {
    const out = applyRoleCoverage(procedure, ['ROLE-CU']);
    const witness = out.roleSections.find((s: any) => s.steps?.[0]?.id === 'witness')!;
    expect(witness.roleCode).toBe('TOUS');
    expect(witness.roleLabelFR).toBe("Personne qui constate l'incident");
  });

  it('sans décision, le rôle absent est retiré et signalé', () => {
    const out = applyRoleCoverage(procedure, ['ROLE-CU']);
    expect(out.roleSections.map((s: any) => s.roleCode)).not.toContain('ROLE-EPI');
    const uncovered = findUncoveredRoles([procedure], ['ROLE-CU']);
    expect(uncovered.map((u) => u.code)).toEqual(['ROLE-EPI', 'ROLE-RM']);
    expect(uncovered[0]).toMatchObject({ proposedTakeover: 'ROLE-CU', procedures: [{ id: 'p003' }] });
    expect(uncovered[0].decision).toBeUndefined();
  });

  it('les tâches d’un rôle absent sont reprises par le rôle choisi', () => {
    const out = applyRoleCoverage(procedure, {
      activeCodes: ['ROLE-CU'],
      assignments: { 'ROLE-EPI': 'ROLE-CU', 'ROLE-RM': 'NONE' },
      orgRoles: [],
    });
    const cu = out.roleSections.filter((s: any) => s.roleCode === 'ROLE-CU');
    expect(cu).toHaveLength(1);
    expect(cu[0].steps.map((s: any) => s.id)).toEqual(['cu1', 'P003_reprise_ROLE-EPI', 'epi1', 'epi2']);
    expect(cu[0].steps[1].textFR).toContain('Équipe de première intervention');
    expect(out.roleSections.map((s: any) => s.roleCode)).not.toContain('ROLE-RM');
  });

  it('crée la section du rôle repreneur s’il n’en avait pas', () => {
    const out = applyRoleCoverage(
      { id: 'x', code: 'P009', roleSections: [procedure.roleSections[1]] },
      { activeCodes: ['ROLE-RPR'], assignments: { 'ROLE-EPI': 'ROLE-RPR' }, orgRoles: [] },
    );
    expect(out.roleSections).toHaveLength(1);
    expect(out.roleSections[0]).toMatchObject({ roleCode: 'ROLE-RPR', roleLabelFR: 'Responsable du point de rassemblement' });
  });
});

describe('noms de rôle', () => {
  it('ROLE-CHE s’appelle « Chercheurs » partout', () => {
    expect(roleLabel('ROLE-CHE', 'fr')).toBe('Chercheurs');
  });

  it('un rôle renommé ou ajouté dans l’organigramme garde le nom de l’organigramme', () => {
    const orgRoles = [
      { id: 'sys_epi', roleCode: 'ROLE-EPI', label: 'BRIGADE INCENDIE', label_en: 'FIRE BRIGADE', isActive: true },
      { id: 'custom_role_1', source: 'custom', label: 'GARDIEN DE NUIT', label_en: 'NIGHT GUARD', isActive: true },
    ];
    expect(roleLabel('ROLE-EPI', 'fr', orgRoles)).toBe('Brigade incendie');
    expect(roleLabel('custom_role_1', 'fr', orgRoles)).toBe('Gardien de nuit');
    expect(resolveActiveRoleCodes(orgRoles, {})).toEqual(['ROLE-EPI', 'custom_role_1']);
  });

  it('met en minuscules un nom écrit tout en majuscules', () => {
    expect(sentenceCase("COORDONNATEUR D'URGENCE")).toBe("Coordonnateur d'urgence");
    expect(sentenceCase('Déjà correct')).toBe('Déjà correct');
  });
});

describe('sanitizeAssignments', () => {
  it('ne garde que des reprises vers un rôle actif, ou NONE', () => {
    expect(
      sanitizeAssignments(
        { 'ROLE-EPI': 'ROLE-CU', 'ROLE-RM': 'ROLE-XYZ', 'ROLE-SS': 'NONE', 'ROLE-CU': 'ROLE-RPR' },
        ['ROLE-CU', 'ROLE-RPR'],
      ),
    ).toEqual({ 'ROLE-EPI': 'ROLE-CU', 'ROLE-SS': 'NONE' });
  });
});

describe('bibliothèque', () => {
  it('chaque section de la bibliothèque a un rôle connu ou s’adresse à tous', () => {
    const all = getAllProcedures();
    const active = ['ROLE-AS', 'ROLE-CU', 'ROLE-EPI', 'ROLE-RM', 'ROLE-RPR', 'ROLE-SS', 'ROLE-BRI', 'ROLE-RS', 'ROLE-CHE', 'ROLE-ACC'];
    for (const p of all) {
      const covered = applyRoleCoverage(p, active);
      for (const section of covered.roleSections) {
        expect(section.roleLabelFR).toBeTruthy();
      }
      expect(findUncoveredRoles([p], active)).toEqual([]);
    }
  });

  it('une procédure dont tous les rôles sont repris reste dans le plan', () => {
    const config = { panneauType: 'DOUBLE' };
    const withoutTakeover = getActiveProcedures(config, 'PMU', ['ROLE-CU']);
    const withTakeover = getActiveProcedures(config, 'PMU', {
      activeCodes: ['ROLE-CU'],
      assignments: { 'ROLE-EPI': 'ROLE-CU', 'ROLE-RS': 'ROLE-CU', 'ROLE-RPR': 'ROLE-CU' },
      orgRoles: [],
    });
    expect(withTakeover.length).toBeGreaterThanOrEqual(withoutTakeover.length);
  });
});
