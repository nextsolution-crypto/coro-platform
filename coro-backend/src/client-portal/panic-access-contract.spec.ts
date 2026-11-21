import { readFileSync } from 'fs';
import { join } from 'path';

// Décision du 21 nov. 2026 : tout utilisateur ayant accès au bâtiment peut
// appuyer sur le bouton panique ; le commandement d'incident n'est pas exigé.
describe('Panic button access contract', () => {
  const source = readFileSync(join(__dirname, 'client-portal.controller.ts'), 'utf8');
  const start = source.indexOf("@Post('buildings/:buildingId/panic')");
  const block = source.slice(start, source.indexOf('\n  }\n', start));

  it('requires building access and a throttle, not incident command', () => {
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('assertBuildingAccess');
    expect(block).toContain('@Throttle(');
    expect(block).not.toContain('INCIDENT_COMMAND');
    expect(block).not.toContain('requireIncidentAuthority');
  });
});
