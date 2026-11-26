import { DEFAULT_TEXT_FIXES, ProceduresService, replaceInContent } from './procedures.service';

describe('Corrections de texte des procédures CORO', () => {
  it('remplace le texte dans toutes les chaînes', () => {
    const fix = DEFAULT_TEXT_FIXES.find((f) => f.code === 'P005' && f.from.startsWith('Inform'))!;
    const content = { roles: [{ steps: [{ textEN: `${fix.from}.`, textFR: 'x' }] }] };
    expect(replaceInContent(content, fix.from, fix.to).roles[0].steps[0].textEN).toBe(`${fix.to}.`);
  });

  it("ne réécrit que les procédures qui contiennent encore l'ancien texte", async () => {
    const update = jest.fn();
    const prisma: any = {
      procedureDefault: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'a', code: 'P013', content: { steps: [{ textEN: 'Bring the AED, located [DEA LOCATION], if: x' }] } },
          { id: 'b', code: 'P005', content: { steps: [{ textEN: 'Déjà corrigé' }] } },
        ]),
        update,
      },
    };
    const service = new ProceduresService(prisma);
    await expect(service.applyDefaultTextFixes()).resolves.toBe(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.content.steps[0].textEN).toBe('Bring the AED (location: [DEA LOCATION]) if: x');
  });
});
