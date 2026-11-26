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
