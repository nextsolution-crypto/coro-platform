import { translateModule2Row } from '../generator/module2.templates';
import { optionToEnglish, displayOptionFor } from './templates/modules/option-display';
import { localizeModule8ForEnglish, unescapeNewlines } from './module8-localize';
import { renderModule7 } from './templates/modules/module7.template';

describe('Export anglais — textes fournis par CORO', () => {
  it('traduit les libellés du modèle de la liste téléphonique, pas les saisies', () => {
    expect(translateModule2Row({ role: 'Responsable sécurité', name: 'Luc', phone: '1' }).role).toBe('Security Officer');
    expect(translateModule2Row({ role: "Coordonnateur d'urgence", name: '', phone: '' }).role).toBe('Emergency Coordinator');
    expect(translateModule2Row({ role: "Entretien et maintenance du panneau d'alarme incendie", name: '', phone: '' }).role)
      .toBe('Fire alarm panel maintenance');
    expect(translateModule2Row({ role: 'Directeur des opérations immobilières', name: '', phone: '' }).role)
      .toBe('Directeur des opérations immobilières');
  });

  it('traduit les organismes externes et leurs numéros, sauf numéro modifié', () => {
    const row = translateModule2Row({ role: 'Ministère des Transports du Québec', phone: '5-1-1 ou 1 (888) 355-0511' });
    expect(row.phone).toBe('5-1-1 or 1 (888) 355-0511');
    expect(translateModule2Row({ role: 'Séismes Canada', phone: '1 (613) 995-0600' }).role).toBe('Earthquakes Canada');
    expect(translateModule2Row({ role: 'Info-Santé', phone: '811 (modifié)' }).phone).toBe('811 (modifié)');
    expect(translateModule2Row({ role: 'Siège social — Firme X', phone: '' }).role).toBe('Firme X Head Office');
  });

  it('traduit les choix du configurateur, accents et apostrophes ignorés', () => {
    expect(optionToEnglish('D - Établissements d’affaires')).toBe('D - Business and personal services occupancies');
    expect(optionToEnglish('Incombustible - Béton')).toBe('Noncombustible - Concrete');
    expect(optionToEnglish('Sous eau')).toBe('Wet pipe');
    expect(optionToEnglish('Mur extérieur est, près du quai')).toBe('Mur extérieur est, près du quai');
    expect(displayOptionFor('Centralise', 'fr')).toBe('Centralisé');
    expect(displayOptionFor('Centralise', 'en')).toBe('Centralized');
  });

  it('rend le module 6 anglais avec les choix traduits et le français intact', () => {
    const config = { buildingType: 'Tour à bureaux', cvacType: 'Centralisé', generatriceEquipements: ['Alarme incendie', 'Eclairage d urgence'], generatrice: true };
    const en = renderModule7({}, config, 'en').map((s) => s.html).join('');
    const fr = renderModule7({}, config, 'fr').map((s) => s.html).join('');
    expect(en).toContain('Office tower');
    expect(en).not.toContain('Tour à bureaux');
    expect(en).toContain('Emergency lighting');
    expect(fr).toContain('Tour à bureaux');
    // Le rendu anglais ne laisse pas la langue anglaise active pour le rendu suivant.
    expect(renderModule7({}, config, 'fr').map((s) => s.html).join('')).toContain('Tour à bureaux');
  });

  it('remplace dans le module 8 le texte resté identique au modèle français', () => {
    const modulesFr = [{ moduleNumber: 8, sections: [
      { id: '8.6', content: 'Insérez les rapports.' },
      { id: '8.4', entries: [{ article: 'a1', equipement: 'SORTIE DE SECOURS', codeNorme: 'CNPI' }] },
      { id: '8.11', tables: [{ id: 'vents', title: 'Vents', rows: [{ zones: 'Toit', priorite: 'Élevée' }] }] },
    ] }];
    const modulesEn = [{ moduleNumber: 8, sections: [
      { id: '8.6', content: 'Insert the reports.' },
      { id: '8.4', entries: [{ article: 'a1', equipement: 'EMERGENCY EXIT', codeNorme: 'NBC' }] },
      { id: '8.11', tables: [{ id: 'vents', title: 'Winds', rows: [{ zones: 'Roof', priorite: 'High' }] }] },
    ] }];
    const saved = {
      section8_6: 'Insérez les rapports.',
      section8_4: [{ id: 'x1', article: 'a1', equipement: 'SORTIE DE SECOURS', codeNorme: 'CNPI', observations: 'Porte bloquée' }],
      section8_11: { tables: [{ id: 'vents', title: 'Vents', rows: [{ zones: 'Toit et terrasse', priorite: 'Élevée' }] }] },
    };
    const out = localizeModule8ForEnglish(saved, modulesFr, modulesEn);
    expect(out.section8_6).toBe('Insert the reports.');
    expect(out.section8_4[0]).toMatchObject({ id: 'x1', equipement: 'EMERGENCY EXIT', codeNorme: 'NBC', observations: 'Porte bloquée' });
    expect(out.section8_11.tables[0].title).toBe('Winds');
    expect(out.section8_11.tables[0].rows[0]).toEqual({ zones: 'Toit et terrasse', priorite: 'High' });
  });

  it('corrige les « \\n » enregistrés en toutes lettres', () => {
    expect(unescapeNewlines('a\\n- b')).toBe('a\n- b');
  });
});

describe('Export anglais — références de code', () => {
  it('affiche les codes en anglais', () => {
    const en = renderModule7({}, { anneeConstruction: 2016 }, 'en').map((s) => s.html).join('');
    expect(en).toContain('NFC 2020 as amended in Quebec (Chapter VIII)');
    expect(en).toContain('NBC 2010 as amended in Quebec');
    const fr = renderModule7({}, { anneeConstruction: 2016 }, 'fr').map((s) => s.html).join('');
    expect(fr).toContain('CNB 2010 modifié Québec');
  });
});

describe('Tableau 8.4 — renvois vérifiés au CNPI 2020 mod. Québec', () => {
  const { fixLegacyInspectionRows } = require('../generator/module8.templates');
  it('corrige les anciens articles des lignes enregistrées et met NFC en anglais', () => {
    const rows = fixLegacyInspectionRows([
      { equipement: 'SORTIE DE SECOURS', article: 'art. 2.7.2.1 (2)', codeNorme: 'CNPI' },
      { equipement: 'PANNEAU INCENDIE', article: 'art. 6.3.1.1 (1)', codeNorme: 'CNPI / CAN/ULC-S536' },
      { equipement: 'AVERTISSEUR DE MONOXYDE DE CARBONE', article: 'art. 6.3.1.2 (1)', codeNorme: 'CNPI' },
      { equipement: 'SYSTÈME D\'EXTINCTION SPÉCIAL', article: 'art. 6.7.1.2 (1)', codeNorme: 'CNPI' },
      { equipement: 'ASCENSEUR', article: 'art. 7.2.2.1 (2)', codeNorme: 'ASME A17.1 / CSA B44' },
    ], 'fr');
    expect(rows.map((r: any) => r.article)).toEqual(['art. 2.7.1.6 (1)', 'art. 6.3.1.2 (1)', 'art. 6.7.1.1 (1)', 'art. 6.6.1.1 (1)', 'art. 7.2.2.1 (2)']);
    const en = fixLegacyInspectionRows([{ equipement: 'FIRE ALARM PANEL', article: 'art. 6.3.1.1 (1)', codeNorme: 'NBC / CAN/ULC-S536' }], 'en');
    expect(en[0]).toMatchObject({ article: 'art. 6.3.1.2 (1)', codeNorme: 'NFC / CAN/ULC-S536' });
  });
});

describe('Renvois réglementaires des modules déjà générés', () => {
  const { withCurrentReferences } = require('./english-content');
  it('remplace les anciens paragraphes de 2.8.2.1 en FR et en EN', () => {
    const out = withCurrentReferences({
      modules_fr: [{ sections: [{ content: "Conformément à l'article 2.8.2.1 (4) du Code national de prévention des incendies – Canada 2020, incorporé" }] }],
      modules_en: [{ sections: [{ content: 'In accordance with article 2.8.2.1 (3) of the amended NFCC 2020, personnel' }] }],
    });
    expect(out.modules_fr[0].sections[0].content).toContain('2.8.2.1, paragraphe 2)');
    expect(out.modules_en[0].sections[0].content).toContain('Sentence (3)(c)');
  });
});

describe('Module 6 anglais — acronyme du code de prévention', () => {
  it('écrit NFC et non CNPI', () => {
    const en = renderModule7({}, { hotWorkFrequency: 'Occasionnellement', travauxPointsChauds: 'Occasionnellement' }, 'en').map((s) => s.html).join('');
    expect(en).not.toMatch(/\bCNPI\b/);
  });
});
