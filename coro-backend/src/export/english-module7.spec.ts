import { englishModule7 } from './english-content';

describe('Module 7 dans le PDF anglais', () => {
  it('traduit les informations d\'occupation et les légendes de photos', async () => {
    const translator: any = {
      translate: jest.fn(async (texts: Set<string>) =>
        new Map([...texts].map((t) => [t, t === 'Entrées accessibles avec carte à puce.' ? 'Entrances accessible with a smart card.' : `EN:${t}`]))),
    };
    const out = await englishModule7(
      translator,
      {
        quartsData: { infosSup: 'Entrées accessibles avec carte à puce.' },
        photosData: {
          a: { label: 'Ascenseurs', base64: 'x' },
          b: { label: "Escaliers d'urgence", base64: 'y' },
          c: { label: 'Salle électrique du 3e', base64: 'z' },
        },
      },
      [],
    );
    expect(out.quartsData.infosSup).toBe('Entrances accessible with a smart card.');
    expect(out.photosData.a.label).toBe('Elevators');
    expect(out.photosData.b.label).toBe('Emergency stairwells');
    expect(out.photosData.c.label).toBe('EN:Salle électrique du 3e');
    expect(out.photosData.a.base64).toBe('x');
    // Les légendes connues ne passent pas par la traduction automatique.
    expect([...translator.translate.mock.calls[0][0]]).toEqual(['Entrées accessibles avec carte à puce.', 'Salle électrique du 3e']);
  });
});

describe('Journal des modifications des plans déjà générés', () => {
  it('accentue en français et traduit en anglais le motif enregistré', () => {
    const { withCurrentReferences } = require('./english-content');
    const out = withCurrentReferences({
      modules_fr: [{ sections: [{ content: '| 2025-06-05 | Creation initiale | A |\n| 2026-09-05 | Mise a jour annuelle | B |' }] }],
      modules_en: [{ sections: [{ content: '| 2025-06-05 | Creation initiale | A |' }] }],
    });
    expect(out.modules_fr[0].sections[0].content).toBe('| 2025-06-05 | Création initiale | A |\n| 2026-09-05 | Mise à jour annuelle | B |');
    expect(out.modules_en[0].sections[0].content).toBe('| 2025-06-05 | Initial creation | A |');
  });
});
