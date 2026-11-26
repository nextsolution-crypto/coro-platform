/**
 * Couverture configurateur → PDF.
 * Chaque champ du configurateur doit avoir un effet sur le document produit
 * (modules générés 1, 2, 3, 8 et rendu du module « Données du bâtiment »).
 * Méthode : configuration complète, puis retrait d'un champ à la fois ; si le
 * rendu ne change pas, le champ n'arrive pas jusqu'au PDF.
 */
import { ConfiguratorService } from './configurator.service';
import { GeneratorService } from '../generator/generator.service';
import { generateModule1 } from '../generator/module1/module1.index';
import { generateModule2 } from '../generator/module2.templates';
import { generateModule3 } from '../generator/module3.templates';
import { generateModule8 } from '../generator/module8.templates';
import { renderModule7 } from '../export/templates/modules/module7.template';

type Field = { key: string; label: string; type: string; options?: string[]; checkboxOptions?: string[]; schema?: Field[] };

function collectFields(questions: any): Field[] {
  const out: Field[] = [];
  const walk = (node: any) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (typeof node.key === 'string' && typeof node.type === 'string') out.push(node);
    for (const [k, v] of Object.entries(node)) if (k !== 'schema' && (Array.isArray(v) || (v && typeof v === 'object'))) walk(v);
  };
  walk(questions.sections);
  return out;
}

function sample(field: Field, i: number): any {
  switch (field.type) {
    case 'text': return `ZQ${i}X`;
    case 'number': return 7000 + i;
    case 'date': return `2031-0${(i % 9) + 1}-1${i % 9}`;
    case 'time': return `0${i % 9}:4${i % 9}`;
    case 'boolean': return true;
    case 'select': return field.options?.[field.options.length > 1 ? 1 : 0] ?? 'Autre';
    case 'checkbox_group': return [...(field.checkboxOptions || field.options || [])];
    case 'dynamic_list': {
      const item: Record<string, any> = {};
      (field.schema || []).forEach((sub, j) => { item[sub.key] = sample(sub, i * 100 + j); });
      return [item];
    }
    default: return `ZQ${i}X`;
  }
}

function emptyOf(field: Field): any {
  return field.type === 'boolean' ? false : field.type === 'dynamic_list' || field.type === 'checkbox_group' ? [] : undefined;
}

async function render(config: any, documentType: string): Promise<string> {
  const project = {
    documentType,
    client: { name: 'Client', phone: '' }, building: { name: 'Bâtiment', address: '1 rue A', city: 'Laval', province: 'QC', buildingType: config.buildingType },
    user: { firstName: 'A', lastName: 'B' }, organization: { companyName: 'Firme' },
  };
  const svc: any = new GeneratorService({ project: { findUnique: async () => project } } as any, null as any, null as any);
  const ctx = await svc.buildContext('p', config);
  const m1 = generateModule1(ctx);
  const m2: any = generateModule2(ctx);
  const s22 = (m2?.fr?.sections || m2?.sections || []).find?.((s: any) => s.id === '2.2');
  let m3: any = null;
  try { m3 = generateModule3(ctx, config, s22, []); } catch { m3 = null; }
  const m8 = generateModule8(ctx, config);
  const html = ['fr', 'en'].map((lang) => renderModule7({}, config, lang as 'fr' | 'en').map((s) => s.html).join('')).join('');
  return JSON.stringify([m1, m2, m3, m8]) + html.replace(/<[^>]+>/g, ' ');
}

describe('Couverture configurateur → PDF', () => {
  jest.setTimeout(120000);

  it('chaque champ du configurateur a un effet sur le document', async () => {
    const questions = await (Object.create(ConfiguratorService.prototype) as any).getQuestions();
    const fields = collectFields(questions).filter((f) => f.key !== 'typeDocument');
    const full: Record<string, any> = {};
    fields.forEach((f, i) => { full[f.key] = sample(f, i); });

    const results: string[] = [];
    // Scénarios : bureau (PMU), industriel (PMU), PSI ; un champ « avec effet »
    // dans au moins un scénario arrive jusqu'au PDF.
    const scenarios: Array<[string, string, Record<string, any>]> = [
      ['PMU', 'PMU', {}],
      ['PMU-IND', 'PMU', { buildingType: 'Industriel' }],
      ['PSI', 'PSI', {}],
    ];
    for (const [label, docType, extra] of scenarios) {
      const cfg = { ...full, ...extra, typeDocument: docType };
      const base = await render(cfg, docType);
      for (const [i, f] of fields.entries()) {
        if (f.key in extra) continue;
        const without = await render({ ...cfg, [f.key]: emptyOf(f) }, docType);
        const effect = without !== base;
        let detail = '';
        if (f.type === 'text' && !base.includes(`ZQ${i}X`)) detail = 'valeur non affichée';
        if (f.type === 'dynamic_list') {
          const missing = (f.schema || []).filter((sub, j) => {
            const v = sample(sub, i * 100 + j);
            return typeof v === 'string' && v.startsWith('ZQ') && !base.includes(v);
          }).map((s) => s.key);
          if (missing.length) detail = `sous-champs non affichés : ${missing.join(', ')}`;
        }
        if (f.type === 'checkbox_group') {
          const opts = f.checkboxOptions || f.options || [];
          const silent: string[] = [];
          for (const opt of opts) {
            const minus = await render({ ...cfg, [f.key]: opts.filter((o) => o !== opt) }, docType);
            if (minus === base) silent.push(opt);
          }
          if (silent.length) detail = `options sans effet : ${silent.join(' | ')}`;
        }
        results.push(`${label}\t${f.key}\t${f.type}\t${effect ? 'effet' : 'AUCUN EFFET'}\t${detail}\t${f.label}`);
      }
    }
    if (process.env.COVERAGE_REPORT) require('fs').writeFileSync(process.env.COVERAGE_REPORT, results.join('\n'));

    // Un champ doit avoir un effet dans au moins un scénario.
    const effective = new Set(results.filter((r) => r.split('\t')[3] === 'effet').map((r) => r.split('\t')[1]));
    // Masqués dans la configuration complète, vérifiés isolément ci-dessous.
    const checkedSeparately = new Set(['restaurantBar', 'versionDocument']);
    const silent = fields.map((f) => f.key).filter((k) => !effective.has(k) && !checkedSeparately.has(k));
    expect(silent).toEqual([]);
    const gaps = results.filter((r) => r.split('\t')[3] === 'effet' && r.split('\t')[4]);
    expect(gaps).toEqual([]);
  });

  it('« Restaurant ou débit de boissons » seul rend le PSI obligatoire', async () => {
    const cfg = { usagePrincipal: 'A2 - Etablissements de reunion', capaciteMaxReglementaire: 20 };
    expect(await render({ ...cfg, restaurantBar: true }, 'PMU')).not.toBe(await render(cfg, 'PMU'));
  });

  it('« Version du document » s\'affiche quand l\'historique est vide', async () => {
    const out = await render({ versionDocument: 'Mise a jour annuelle', historiqueList: [] }, 'PMU');
    expect(out).toContain('Mise a jour annuelle');
  });
});
