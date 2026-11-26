import {
  ExportTranslator,
  applyTexts,
  collectTexts,
  hashText,
  isTranslatable,
  replaceInsertedValues,
} from './export-translator';

describe('Traduction des textes saisis (export anglais)', () => {
  it('ne retient que du texte libre', () => {
    expect(isTranslatable('Parc de l\'autre côté de la rue')).toBe(true);
    expect(isTranslatable('(514) 555-0100')).toBe(false);
    expect(isTranslatable('data:image/png;base64,AAAA')).toBe(false);
    expect(isTranslatable('https://exemple.ca')).toBe(false);
    expect(isTranslatable('Sous eau')).toBe(false); // choix du configurateur : traduction fixe
  });

  it('collecte et applique sans toucher aux identifiants, dates, photos ni courriels', () => {
    const config = {
      id: 'Bureau principal',
      dateReleve: 'Mardi prochain',
      photoBase64: 'Salle des serveurs',
      email: 'jean@exemple.ca',
      pointRassemblement: 'Parc de l\'autre côté de la rue',
      liste: [{ emplacement: 'Salle des serveurs, 2e étage' }],
    };
    const texts = [...collectTexts(config, new Set())].sort();
    expect(texts).toEqual(['Parc de l\'autre côté de la rue', 'Salle des serveurs, 2e étage']);
    const map = new Map([
      ['Parc de l\'autre côté de la rue', 'Park across the street'],
      ['Salle des serveurs, 2e étage', 'Server room, 2nd floor'],
    ]);
    const out = applyTexts(config, map);
    expect(out.pointRassemblement).toBe('Park across the street');
    expect(out.liste[0].emplacement).toBe('Server room, 2nd floor');
    expect(out.photoBase64).toBe('Salle des serveurs');
    expect(out.id).toBe('Bureau principal');
  });

  it('remplace les valeurs françaises insérées dans le texte anglais généré', () => {
    const modules = [{ sections: [{ id: '1.2', content: 'The plan rests with the Directeur de la sécurité of X.' }] }];
    const out = replaceInsertedValues(modules, new Map([['Directeur de la sécurité', 'Security Director'], ['Oui', 'Yes']]));
    expect(out[0].sections[0].content).toBe('The plan rests with the Security Director of X.');
    expect(out[0].sections[0].id).toBe('1.2');
  });

  it('utilise la mémoire des traductions et garde l\'original sans IA', async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const prisma = {
      textTranslation: {
        findMany: jest.fn().mockResolvedValue([{ sourceHash: hashText('Console de sécurité'), translatedText: 'Security desk' }]),
        createMany: jest.fn(),
      },
    };
    const map = await new ExportTranslator(prisma).translate(['Console de sécurité', 'Entrée principale, porte Ouest']);
    expect(map.get('Console de sécurité')).toBe('Security desk');
    expect(map.has('Entrée principale, porte Ouest')).toBe(false);
    expect(prisma.textTranslation.createMany).not.toHaveBeenCalled();
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  });

  it('ne fait jamais échouer l\'export si la mémoire est illisible', async () => {
    const prisma = { textTranslation: { findMany: jest.fn().mockRejectedValue(new Error('table absente')), createMany: jest.fn() } };
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(new ExportTranslator(prisma).translate(['Console de sécurité'])).resolves.toBeInstanceOf(Map);
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  });
});

describe('Traduction par CORO AI (Bedrock)', () => {
  const { parseBedrockTranslations } = require('./export-translator');

  it('lit les traductions de l\'outil et ignore les identifiants inconnus', () => {
    const response = { output: { message: { content: [{ toolUse: { name: 'coro_translations', input: { translations: [
      { id: '0', text: 'Security desk' }, { id: '7', text: 'intrus' }, { id: '1', text: '' },
    ] } } }] } } };
    expect(parseBedrockTranslations(response, 2)).toEqual({ '0': 'Security desk' });
    expect(parseBedrockTranslations({}, 2)).toBeNull();
  });

  it('passe par Bedrock d\'abord, puis Anthropic pour le reste, et mémorise', async () => {
    const env = { ...process.env };
    process.env.CORO_AI_PROVIDER = 'bedrock';
    process.env.CORO_AI_BEDROCK_INVOCATION_ENABLED = 'true';
    process.env.ANTHROPIC_API_KEY = 'test';
    const prisma = { textTranslation: { findMany: jest.fn().mockResolvedValue([]), createMany: jest.fn() } };
    const translator: any = new ExportTranslator(prisma);
    const bedrock = jest.spyOn(translator, 'translateWithBedrock').mockResolvedValue({ '0': 'Security desk' });
    const anthropic = jest.spyOn(translator, 'translateBatch').mockResolvedValue({ '0': 'Main entrance, west door' });
    const map = await translator.translate(['Console de sécurité', 'Entrée principale, porte Ouest']);
    expect(bedrock).toHaveBeenCalledWith(['Console de sécurité', 'Entrée principale, porte Ouest']);
    expect(anthropic).toHaveBeenCalledWith(['Entrée principale, porte Ouest']);
    expect(map.get('Console de sécurité')).toBe('Security desk');
    expect(map.get('Entrée principale, porte Ouest')).toBe('Main entrance, west door');
    expect(prisma.textTranslation.createMany.mock.calls[0][0].data).toHaveLength(2);
    process.env = env;
  });
});
