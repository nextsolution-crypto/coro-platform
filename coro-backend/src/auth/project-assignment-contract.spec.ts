import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

/**
 * Contrat d'affectation des projets (audit M3-09).
 *
 * Règle : un conseiller opérateur n'accède qu'aux projets qui lui sont
 * affectés. Un accès à un projet filtré seulement par organisation
 * (`where: { id: projectId, organizationId }`) contourne cette règle.
 * Ce test échoue dès qu'un nouveau contournement apparaît ; les cas
 * existants sont listés avec leur justification ou leur statut de dette.
 */
const KNOWN_ORGANIZATION_ONLY = new Map<string, string>([
  ['src/generator/generator.service.ts', 'lecture interne après contrôle d’accès de la génération'],
  ['src/activities/activity-task-lists.service.ts', 'précédé de lockMutableProject (affectation vérifiée)'],
  ['src/bookings/booking-eligibility.service.ts', 'contrôle de rôle dédié'],
  ['src/auth/project-access.ts', 'lockProjectForTaskWork : lecture d’état après vérification de l’affectation à l’activité'],
]);

const PATTERN = /where:\s*\{\s*id:\s*projectId,\s*organizationId(?:\s*:\s*[\w.]+)?\s*\}/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) out.push(path);
  }
  return out;
}

describe("contrat d'affectation des projets (M3-09)", () => {
  it("aucun nouvel accès projet filtré seulement par organisation", () => {
    const root = join(__dirname, '..', '..');
    const offenders = walk(join(root, 'src'))
      .filter((file) => PATTERN.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file).replace(/\\/g, '/'))
      .filter((file) => ![...KNOWN_ORGANIZATION_ONLY.keys()].some((known) => file.startsWith(known)));
    expect(offenders).toEqual([]);
  });
});
