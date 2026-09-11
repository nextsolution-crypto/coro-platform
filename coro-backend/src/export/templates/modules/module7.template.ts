// ============================================================
// CORO — Module 7 : Description du site et équipements
// Renderer PDF — version alignée avec le configurateur actuel
// ============================================================

import { PASS_EXTINGUISHER_IMAGE } from './pass-image.asset';

// ============================================================
// HELPERS
// ============================================================

function val(v: any, fallback = '—'): string {
  if (v === undefined || v === null || v === '') return fallback;
  return String(v);
}

function bool(v: any, isFr: boolean): string {
  if (v === true) return isFr ? 'Oui' : 'Yes';
  if (v === false) return isFr ? 'Non' : 'No';
  return '—';
}

function escapeHtml(value: any): string {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeVal(v: any, fallback = '—'): string {
  const raw = val(v, fallback);
  return raw === fallback ? fallback : escapeHtml(raw);
}

function listVal(v: any, fallback = '—'): string {
  if (!Array.isArray(v) || v.length === 0) return fallback;
  return v.map((item: any) => escapeHtml(item)).join(', ');
}

function withUnit(v: any, unit: string, fallback = '—'): string {
  if (v === undefined || v === null || v === '') return fallback;
  return `${escapeHtml(v)}${unit}`;
}

function hasValue(v: any): boolean {
  return v !== undefined && v !== null && v !== '';
}

function isHighRise(config: any): boolean {
  return (
    config?.hauteurBatiment === true ||
    config?.hauteurBatiment === 'GRANDE_HAUTEUR'
  );
}

function highRiseBoolValue(config: any): boolean | undefined {
  if (isHighRise(config)) return true;

  if (
    config?.hauteurBatiment === false ||
    config?.hauteurBatiment === 'STANDARD'
  ) {
    return false;
  }

  return undefined;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="font-weight:600;width:45%;">${label}</td>
      <td>${value}</td>
    </tr>
  `;
}

function checklistItem(label: string, checked: boolean): string {
  const icon = checked ? '☑' : '☐';
  const color = checked ? '#C0392B' : '#ADB5BD';
  return `
    <div style="display:flex;align-items:center;gap:8px;padding:4px 0;">
      <span style="color:${color};font-size:12pt;">${icon}</span>
      <span style="font-size:10pt;color:#495057;">${label}</span>
    </div>
  `;
}

function subHeading(text: string): string {
  return `<p class="sub-heading">${text}</p>`;
}

function subSection(heading: string, content: string): string {
  return `
    <div style="break-inside:avoid;page-break-inside:avoid;">
      <p class="sub-heading">${heading}</p>
      ${content}
    </div>
  `;
}

function computeReferentielCNB(anneeRaw: any): { label: string; periode: string } {
  const annee =
    typeof anneeRaw === 'string'
      ? parseInt(anneeRaw, 10)
      : anneeRaw || 0;

  if (!annee || isNaN(annee)) {
    return {
      label: '—',
      periode: 'Année non renseignée',
    };
  }

  if (annee < 1976)
    return {
      label: 'Règlement sur la sécurité dans les édifices publics',
      periode: 'Avant le 1er déc. 1976',
    };
  if (annee <= 1983)
    return {
      label: 'Code du bâtiment (R.R.Q., 1981)',
      periode: '1976–1984',
    };
  if (annee <= 1985)
    return { label: 'CNB 1980', periode: '1984–1986' };
  if (annee <= 1993)
    return { label: 'CNB 1985 modifié Québec', periode: '1986–1993' };
  if (annee <= 2000)
    return { label: 'CNB 1990 modifié Québec', periode: '1993–2000' };
  if (annee <= 2008)
    return { label: 'CNB 1995 modifié Québec', periode: '2000–2008' };
  if (annee <= 2015)
    return { label: 'CNB 2005 modifié Québec', periode: '2008–2015' };
  if (annee <= 2021)
    return { label: 'CNB 2010 modifié Québec', periode: '2015–2022' };
  if (annee <= 2024)
    return { label: 'CNB 2015 modifié Québec', periode: '2022–2025' };

  return {
    label: 'CNB 2020 modifié Québec',
    periode: 'Depuis le 17 avril 2025',
  };
}

function computePsiRequisLabel(config: any, isFr: boolean): string {
  const usage = (config.usagePrincipal || '').trim();
  const capacite = config.capaciteMaxReglementaire || 0;
  const traitements = config.traitementsMedicauxSurPlace || false;

  if (!usage) return isFr ? 'Non déterminé' : 'Undetermined';

  if (usage.startsWith('B')) {
    return isFr
      ? '✓ Requis — Usage groupe B'
      : '✓ Required — Group B use';
  }

  if (usage.startsWith('D') && traitements) {
    return isFr
      ? '✓ Requis — Traitements médicaux sur place'
      : '✓ Required — Medical treatments on site';
  }

  if (usage.startsWith('D')) {
    return isFr
      ? 'À vérifier — Confirmer les traitements médicaux'
      : 'To verify — Confirm medical treatments';
  }

  if (
    usage.startsWith('A1') ||
    usage.startsWith('A2') ||
    usage.startsWith('A3') ||
    usage.startsWith('A4')
  ) {
    return isFr ? '✓ Requis' : '✓ Required';
  }

  if (usage.startsWith('A')) {
    if (!capacite) {
      return isFr
        ? 'À vérifier — Renseigner la capacité maximale réglementaire'
        : 'To verify — Enter maximum regulatory capacity';
    }

    if (capacite <= 30) {
      return isFr
        ? `Exempté — ${capacite} personnes (≤ 30, art. 2.8.1.1)`
        : `Exempted — ${capacite} persons (≤ 30, art. 2.8.1.1)`;
    }

    return isFr
      ? `✓ Requis — Capacité déclarée : ${capacite} personnes`
      : `✓ Required — Declared capacity: ${capacite} persons`;
  }

  if (
    usage.startsWith('C') ||
    usage.startsWith('E') ||
    usage.startsWith('F')
  ) {
    return isFr ? '✓ Requis' : '✓ Required';
  }

  return isFr ? 'À vérifier' : 'To verify';
}

function computeFrequenceLabel(config: any, isFr: boolean): string {
  const usage = (config.usagePrincipal || '').trim();

  if (config.laboratoirePresent) {
    return isFr
      ? 'Tous les 3 mois (laboratoire — art. 2.8.3.2)'
      : 'Every 3 months (laboratory — art. 2.8.3.2)';
  }

  if (usage.startsWith('B') || config.lieuSommeil) {
    return isFr
      ? 'Tous les 6 mois (art. 2.8.3.2)'
      : 'Every 6 months (art. 2.8.3.2)';
  }

  if (isHighRise(config) && !usage.startsWith('C')) {
    return isFr
      ? 'Tous les 6 mois — grande hauteur (art. 2.8.3.2)'
      : 'Every 6 months — high-rise (art. 2.8.3.2)';
  }

  if (usage.startsWith('A1')) {
    return isFr
      ? 'Tous les 3 mois (art. 2.8.3.2)'
      : 'Every 3 months (art. 2.8.3.2)';
  }

  if (usage.startsWith('A2')) {
    return isFr
      ? '2 fois par an — automne et printemps (art. 2.8.3.2)'
      : 'Twice a year — fall and spring (art. 2.8.3.2)';
  }

  return isFr
    ? 'Tous les 12 mois (art. 2.8.3.2)'
    : 'Every 12 months (art. 2.8.3.2)';
}

// ============================================================
// RENDERER
// ============================================================

export function renderModule7(
  module7Data: any,
  config: any,
  lang: 'fr' | 'en',
  moduleSeqNumber: number = 7,
): { id: string; title: string; html: string }[] {
  const isFr = lang === 'fr';
  config = config || {};

  const quarts = module7Data?.quartsData || {};
  const photos = module7Data?.photosData || {};

  const salleGicleursLieu =
    config.salleGicleurs ?? config.salleGicleursLocalisation;

  const isIndustriel =
    config.buildingType === 'Industriel' ||
    config.usagePrincipal?.startsWith('F');

  const palettierPresent =
    config.palettierPresent ?? config.palettiers;
  const mezzaninePresent =
    config.mezzaninePresent ?? config.mezzanine;
  const chariotsPresent =
    config.chariotsPresent ?? config.chariotsElevateurs;

  const hasHotWork =
    (config.travauxPointsChauds &&
      config.travauxPointsChauds !== 'Jamais') ||
    config.travailChaud === true;

  let subsectionCounter = 0;

  const sectionHeader = (_unusedId: string, line2: string) => {
    subsectionCounter += 1;
    const displayId = `${moduleSeqNumber}.${subsectionCounter}`;

    return `
      <div class="section-header">
        <span class="section-id">${displayId}</span>
        <span class="section-title-line2">${line2}</span>
        <div class="section-bar"></div>
      </div>
    `;
  };

  // ============================================================
  // 7.1 — DESCRIPTION GÉNÉRALE
  // ============================================================

  const quartsOccupation = config.quartsOccupation || [];

  const quartsRows = quartsOccupation
    .map(
      (q: any) => `
      <tr>
        <td style="font-weight:600;">
          ${safeVal(q.nomQuart)} (${safeVal(q.heureDebut)} – ${safeVal(q.heureFin)})
        </td>
        <td style="text-align:center;">${safeVal(q.occupantsSemaine)}</td>
        <td style="text-align:center;">${safeVal(q.occupantsSamedi)}</td>
        <td style="text-align:center;">${safeVal(q.occupantsDimanche)}</td>
      </tr>
    `,
    )
    .join('');

  const html71 = `
    <div>
      ${sectionHeader(
        '7.1',
        isFr ? 'DESCRIPTION GÉNÉRALE' : 'GENERAL DESCRIPTION',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Type de bâtiment' : 'Building type',
            safeVal(config.buildingType),
          )}
          ${infoRow(
            isFr ? 'Usage principal' : 'Primary use',
            safeVal(config.usagePrincipal),
          )}
          ${infoRow(
            isFr ? 'Usage secondaire' : 'Secondary use',
            safeVal(config.usageSecondaire),
          )}
          ${
            config.capaciteMaxReglementaire !== undefined &&
            config.capaciteMaxReglementaire !== null &&
            config.capaciteMaxReglementaire !== ''
              ? infoRow(
                  isFr
                    ? 'Capacité maximale réglementaire'
                    : 'Maximum regulatory capacity',
                  `${safeVal(config.capaciteMaxReglementaire)} ${
                    isFr ? 'personnes' : 'persons'
                  }`,
                )
              : ''
          }
          ${infoRow(
            isFr
              ? 'Traitements médicaux sur place'
              : 'Medical treatments on site',
            bool(config.traitementsMedicauxSurPlace, isFr),
          )}
          ${infoRow(
            isFr ? 'Nombre de sous-sols' : 'Number of basements',
            safeVal(config.basements, '0'),
          )}
          ${infoRow(
            isFr ? "Nombre d'étages" : 'Number of floors',
            safeVal(config.floors, '0'),
          )}
          ${infoRow(
            isFr ? '13e étage présent' : '13th floor present',
            bool(config.treizeEtage, isFr),
          )}
          ${infoRow(
            isFr ? 'Grande hauteur (+18m)' : 'High-rise (+18m)',
            bool(highRiseBoolValue(config), isFr),
          )}
          ${infoRow(
            isFr
              ? 'Construction — Étages supérieurs'
              : 'Construction — Upper floors',
            safeVal(config.typeConstructionEtages),
          )}
          ${infoRow(
            isFr ? 'Construction — Toit' : 'Construction — Roof',
            safeVal(config.typeConstructionToit),
          )}
          ${infoRow(
            isFr ? 'Année de construction' : 'Year built',
            safeVal(config.anneeConstruction),
          )}
          ${infoRow(
            isFr ? 'Dernière rénovation majeure' : 'Last major renovation',
            safeVal(config.derniereRenovation),
          )}
          ${infoRow(
            isFr ? 'Superficie (pi²)' : 'Area (sq ft)',
            safeVal(config.superficie),
          )}
          ${
            config.infosBatiment
              ? infoRow(
                  isFr
                    ? 'Informations supplémentaires'
                    : 'Additional information',
                  safeVal(config.infosBatiment),
                )
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Certifications' : 'Certifications')}
      ${
        config.certBOMA || config.certLEED || config.certISO22301 ||
        config.certISO31000 || config.certEnergyStar ||
        hasValue(config.autresCertifications)
          ? `
        <table><tbody>
          ${config.certBOMA ? infoRow('BOMA BEST', hasValue(config.certBOMANiveau) ? safeVal(config.certBOMANiveau) : (isFr ? 'Certifié' : 'Certified')) : ''}
          ${config.certLEED ? infoRow('LEED', hasValue(config.certLEEDNiveau) ? safeVal(config.certLEEDNiveau) : (isFr ? 'Certifié' : 'Certified')) : ''}
          ${config.certISO22301 ? infoRow('ISO 22301', isFr ? 'Oui' : 'Yes') : ''}
          ${config.certISO31000 ? infoRow('ISO 31000', isFr ? 'Oui' : 'Yes') : ''}
          ${config.certEnergyStar ? infoRow('ENERGY STAR', isFr ? 'Oui' : 'Yes') : ''}
          ${hasValue(config.autresCertifications) ? infoRow(isFr ? 'Autres certifications' : 'Other certifications', Array.isArray(config.autresCertifications) ? listVal(config.autresCertifications) : safeVal(config.autresCertifications)) : ''}
        </tbody></table>
      `
          : `<p style="color:#ADB5BD;">${isFr ? 'Aucune certification déclarée' : 'No certification declared'}</p>`
      }

      ${subHeading(
        isFr
          ? 'Cadre réglementaire applicable'
          : 'Applicable Regulatory Framework',
      )}
      <div style="background:#F8F9FA;border-left:4px solid #2C3E50;border-radius:0 4px 4px 0;padding:12px 16px;margin-bottom:12px;">
        <table style="width:100%;margin:0;">
          <tbody>
            ${infoRow(
              isFr ? 'Code de sécurité' : 'Fire Safety Code',
              'CNPI 2020 modifié Québec (Chapitre VIII)',
            )}
            ${hasValue(config.reglementMunicipal) ? infoRow(
              isFr ? 'Règlement municipal applicable' : 'Applicable municipal regulation',
              safeVal(config.reglementMunicipal),
            ) : ''}
            ${(() => {
              const ref = computeReferentielCNB(config.anneeConstruction);
              return infoRow(
                isFr
                  ? 'Référentiel de construction'
                  : 'Construction reference',
                `${ref.label} <span style="color:#6C757D;font-size:8pt;">(${ref.periode})</span>`,
              );
            })()}
            ${infoRow(
              isFr ? 'Période transitoire' : 'Transitional period',
              isFr
                ? "Ancienne version applicable jusqu'au ~17 oct. 2027 (décret 1353-2026, effectif 10 sept. 2026)"
                : 'Previous version applicable until ~Oct. 17, 2027 (Order 1353-2026, effective Sept. 10, 2026)',
            )}
            ${infoRow(
              isFr
                ? 'Plan de sécurité incendie (PSI)'
                : 'Fire Safety Plan (FSP)',
              computePsiRequisLabel(config, isFr),
            )}
            ${infoRow(
              isFr
                ? "Fréquence des exercices d'incendie"
                : 'Fire drill frequency',
              computeFrequenceLabel(config, isFr),
            )}
            ${infoRow(
              isFr
                ? 'Essais intégrés CAN/ULC-S1001'
                : 'CAN/ULC-S1001 integrated testing',
              isFr
                ? 'Bâtiments existants : à compter du 17 avril 2028 (art. 2.1.3.7)'
                : 'Existing buildings: as of April 17, 2028 (art. 2.1.3.7)',
            )}
          </tbody>
        </table>
      </div>

      ${subHeading(isFr ? 'Accès' : 'Access')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Accès aux sous-sols' : 'Basement access',
            listVal(config.accesSousSol),
          )}
          ${
            config.accesSousSolDetails
              ? infoRow(
                  isFr
                    ? 'Détails accès sous-sol'
                    : 'Basement access details',
                  safeVal(config.accesSousSolDetails),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Accès aux étages' : 'Floor access',
            listVal(config.accesEtages),
          )}
          ${
            config.accesEtagesDetails
              ? infoRow(
                  isFr ? 'Détails accès étages' : 'Floor access details',
                  safeVal(config.accesEtagesDetails),
                )
              : ''
          }
        </tbody>
      </table>

      ${subHeading(
        isFr ? 'Occupation et sécurité' : 'Occupancy and security',
      )}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Bâtiment multi-locataires' : 'Multi-tenant building',
            bool(config.multiLocataires, isFr),
          )}
          ${
            config.multiLocataires
              ? infoRow(
                  isFr ? 'Nombre de locataires' : 'Number of tenants',
                  safeVal(config.nbLocataires),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Lieu de sommeil' : 'Sleeping accommodation',
            bool(config.lieuSommeil, isFr),
          )}
          ${infoRow(
            isFr ? 'Sécurité 24 h / 24' : '24/7 security',
            bool(config.securite24h, isFr),
          )}
          ${infoRow(
            isFr ? 'Agent de sécurité' : 'Security guard',
            bool(config.agentSecurite, isFr),
          )}
          ${infoRow(
            isFr ? 'Poste de surveillance' : 'Security station',
            safeVal(config.posteSurveillance),
          )}
          ${infoRow(
            isFr ? "Contrôle d'accès" : 'Access control',
            bool(config.controleAcces, isFr),
          )}
          ${infoRow(
            isFr ? 'Caméras de surveillance' : 'Surveillance cameras',
            bool(config.cameras, isFr),
          )}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Emplacements' : 'Locations')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Poste de commandement' : 'Command post',
            safeVal(config.posteCommandement),
          )}
          ${infoRow(
            isFr
              ? 'Point de rassemblement principal'
              : 'Main assembly point',
            safeVal(config.pointRassemblement),
          )}

          ${
            config.pointRassemblement_snapshot
              ? `
            <tr>
              <td colspan="2" style="padding:8px;">
                <img
                  src="${config.pointRassemblement_snapshot}"
                  style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;border:1px solid #DEE2E6;"
                />
                <p style="font-size:8pt;color:#6C757D;margin-top:4px;font-style:italic;">
                  ${
                    config.pointRassemblement_coords
                      ? `📍 ${config.pointRassemblement_coords.lat.toFixed(
                          6,
                        )}, ${config.pointRassemblement_coords.lng.toFixed(6)}`
                      : ''
                  }
                </p>
              </td>
            </tr>
          `
              : ''
          }

          ${
            config.pointRassemblement2
              ? infoRow(
                  isFr
                    ? 'Point de rassemblement secondaire'
                    : 'Secondary assembly point',
                  safeVal(config.pointRassemblement2),
                )
              : ''
          }

          ${
            config.pointRassemblement2_snapshot
              ? `
            <tr>
              <td colspan="2" style="padding:8px;">
                <img
                  src="${config.pointRassemblement2_snapshot}"
                  style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;border:1px solid #DEE2E6;"
                />
                <p style="font-size:8pt;color:#6C757D;margin-top:4px;font-style:italic;">
                  ${
                    config.pointRassemblement2_coords
                      ? `📍 ${config.pointRassemblement2_coords.lat.toFixed(
                          6,
                        )}, ${config.pointRassemblement2_coords.lng.toFixed(6)}`
                      : ''
                  }
                </p>
              </td>
            </tr>
          `
              : ''
          }

          ${
            config.lieuAccueilTemporaire
              ? infoRow(
                  isFr
                    ? "Lieu d'accueil temporaire"
                    : 'Temporary shelter location',
                  safeVal(config.lieuAccueilTemporaire),
                )
              : ''
          }

          ${
            config.lieuAccueilTemporaire_snapshot
              ? `
            <tr>
              <td colspan="2" style="padding:8px;">
                <img
                  src="${config.lieuAccueilTemporaire_snapshot}"
                  style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;border:1px solid #DEE2E6;"
                />
                <p style="font-size:8pt;color:#6C757D;margin-top:4px;font-style:italic;">
                  ${
                    config.lieuAccueilTemporaire_coords
                      ? `📍 ${config.lieuAccueilTemporaire_coords.lat.toFixed(
                          6,
                        )}, ${config.lieuAccueilTemporaire_coords.lng.toFixed(
                          6,
                        )}`
                      : ''
                  }
                </p>
              </td>
            </tr>
          `
              : ''
          }

          ${
            config.zoneConfinement
              ? infoRow(
                  isFr ? 'Zone de confinement' : 'Shelter-in-place area',
                  safeVal(config.zoneConfinement),
                )
              : ''
          }
          ${
            config.zoneRafraichissement
              ? infoRow(
                  isFr ? 'Zone de rafraîchissement' : 'Cooling area',
                  safeVal(config.zoneRafraichissement),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Boîte à clés pompier' : 'Fire department key box',
            safeVal(config.boiteClePompier),
          )}
          ${infoRow(
            isFr ? 'Trousseau de clés pompier' : 'Fire department key set',
            bool(config.trousseClePompier ?? config.trousseClesPompier, isFr),
          )}
          ${
            (config.trousseClePompier ?? config.trousseClesPompier) &&
            config.trousseClesPompierLieu
              ? infoRow(
                  isFr
                    ? 'Localisation trousseau pompier'
                    : 'Fire department key set location',
                  safeVal(config.trousseClesPompierLieu),
                )
              : ''
          }
          ${
            config.lieuDocument
              ? infoRow(
                  isFr
                    ? 'Lieu de conservation du document'
                    : 'Document storage location',
                  safeVal(config.lieuDocument),
                )
              : ''
          }
          ${
            config.psiDerniereRevision
              ? infoRow(
                  isFr
                    ? 'Dernière révision du PSI'
                    : 'Last FSP revision',
                  safeVal(config.psiDerniereRevision),
                )
              : ''
          }
          ${
            config.programmeInspectionEntretien !== undefined
              ? infoRow(
                  isFr
                    ? "Programme d'inspection et d'entretien"
                    : 'Inspection and maintenance program',
                  bool(config.programmeInspectionEntretien, isFr),
                )
              : ''
          }
        </tbody>
      </table>

      ${
        config.signalisationIssue
          ? `
        ${subHeading(isFr ? "Signalisation d'issue" : 'Exit Signs')}
        <table>
          <tbody>
            ${infoRow(
              isFr ? "Signalisation d'issue présente" : 'Exit signs present',
              bool(config.signalisationIssue, isFr),
            )}
            ${infoRow(
              isFr ? "Type d'alimentation" : 'Power type',
              safeVal(config.signalisationIssueType),
            )}
            ${
              config.signalisationIssueDerniereInspection
                ? infoRow(
                    isFr ? 'Dernière inspection' : 'Last inspection',
                    safeVal(config.signalisationIssueDerniereInspection),
                  )
                : ''
            }
            ${infoRow(
              isFr ? 'Fréquence requise' : 'Required frequency',
              config.signalisationIssueType === 'Piles de secours intégrées'
                ? isFr
                  ? 'Mensuelle (piles) + annuelle — CNPI 2020 art. 6.5.1.8'
                  : 'Monthly (battery) + annual — CNPI 2020 art. 6.5.1.8'
                : isFr
                  ? 'Annuelle — CNPI 2020 art. 6.5.1.8'
                  : 'Annual — CNPI 2020 art. 6.5.1.8',
            )}
          </tbody>
        </table>
      `
          : ''
      }

      ${
        config.portesIssueExposees
          ? `
        ${subHeading(
          isFr
            ? "Portes d'issue — Protection contre l'obstruction"
            : 'Exit Doors — Obstruction Protection',
        )}
        <table>
          <tbody>
            ${infoRow(
              isFr ? 'Mesure en place' : 'Measure in place',
              safeVal(config.portesIssueMesure),
            )}
            ${infoRow(
              isFr ? 'Référence' : 'Reference',
              'CNPI 2020 art. 2.7.1.8',
            )}
          </tbody>
        </table>
      `
          : ''
      }

      ${subHeading(isFr ? 'Occupation des lieux' : 'Building occupancy')}

      ${
        quartsOccupation.length > 0
          ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Quart de travail' : 'Shift'}</th>
              <th style="text-align:center;">${
                isFr ? 'Semaine' : 'Weekday'
              }</th>
              <th style="text-align:center;">${
                isFr ? 'Samedi' : 'Saturday'
              }</th>
              <th style="text-align:center;">${
                isFr ? 'Dimanche' : 'Sunday'
              }</th>
            </tr>
          </thead>
          <tbody>${quartsRows}</tbody>
        </table>
      `
          : `<p style="color:#ADB5BD;">${
              isFr
                ? 'Aucun quart de travail déclaré'
                : 'No work shift declared'
            }</p>`
      }

      ${
        quarts.infosSup
          ? `<p style="margin-top:8px;font-size:10pt;color:#495057;"><strong>${
              isFr
                ? 'Informations supplémentaires'
                : 'Additional information'
            } :</strong> ${escapeHtml(quarts.infosSup)}</p>`
          : ''
      }

      ${
        config.personnelHandicap
          ? subSection(
              isFr
                ? "Personnes nécessitant assistance à l'évacuation (PPNAE)"
                : 'Persons Requiring Evacuation Assistance (PPNAE)',
              `<table><tbody>
                ${infoRow(
                  isFr ? 'Présence de PPNAE' : 'PPNAE present',
                  bool(config.personnelHandicap, isFr),
                )}
                ${
                  (config.ppnaeTypesLimitations || []).length > 0
                    ? infoRow(
                        isFr
                          ? 'Types de limitations'
                          : 'Types of limitations',
                        listVal(config.ppnaeTypesLimitations),
                      )
                    : ''
                }
                ${
                  (config.ppnaeMesures || []).length > 0
                    ? infoRow(
                        isFr
                          ? "Mesures d'évacuation prévues"
                          : 'Evacuation measures in place',
                        listVal(config.ppnaeMesures),
                      )
                    : ''
                }
                ${
                  config.ppnaeRegistreAJour !== undefined
                    ? infoRow(
                        isFr ? 'Registre à jour' : 'Up-to-date register',
                        bool(config.ppnaeRegistreAJour, isFr),
                      )
                    : ''
                }
              </tbody></table>`,
            )
          : ''
      }
    </div>
  `;

  // ============================================================
  // 7.2 — MÉCANIQUE DU BÂTIMENT
  // ============================================================

  const html72 = `
    <div class="page-break">
      ${sectionHeader(
        '7.2',
        isFr ? 'MÉCANIQUE DU BÂTIMENT' : 'BUILDING MECHANICAL SYSTEMS',
      )}

      ${subHeading(isFr ? 'Ascenseurs' : 'Elevators')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Ascenseurs présents' : 'Elevators present',
            bool(config.ascenseurs, isFr),
          )}
          ${
            config.ascenseurs
              ? `
            ${infoRow(
              isFr ? "Nombre d'ascenseurs" : 'Number of elevators',
              safeVal(config.nbAscenseurs),
            )}
            ${infoRow(
              isFr ? 'Type' : 'Type',
              safeVal(config.typeAscenseur),
            )}
            ${infoRow(
              isFr
                ? 'Emplacement salle mécanique'
                : 'Mechanical room location',
              safeVal(config.salleAscenseur),
            )}
            ${infoRow(
              isFr ? 'Ascenseur pompier' : 'Firefighter elevator',
              bool(config.ascenseurPompier, isFr),
            )}
            ${
              config.ascenseurPompier
                ? infoRow(
                    isFr
                      ? 'Ascenseur pompier — lequel'
                      : 'Firefighter elevator — identification',
                    safeVal(config.ascenseurPompierLequel),
                  )
                : ''
            }
            ${infoRow(
              isFr ? "Rappel d'ascenseurs" : 'Elevator recall',
              safeVal(config.rappelAscenseursLieu),
            )}
            ${infoRow(
              isFr
                ? 'Téléphone dans les ascenseurs'
                : 'Phone in elevators',
              bool(config.telephoneAscenseurs, isFr),
            )}
            ${infoRow(
              isFr ? 'Alimentation de secours' : 'Backup power supply',
              bool(config.fonctionneSecours, isFr),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Escaliers' : 'Stairwells')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Escaliers pressurisés' : 'Pressurized stairwells',
            bool(config.escaliersPressurises, isFr),
          )}
          ${infoRow(
            isFr ? "Nombre d'escaliers" : 'Number of stairwells',
            safeVal(config.nbEscaliers),
          )}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Toit' : 'Roof')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Toit verrouillé' : 'Locked roof access',
            bool(config.toitVerrouille, isFr),
          )}
          ${infoRow(
            isFr ? 'Accès au toit' : 'Roof access',
            safeVal(config.accesToit),
          )}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Séparation coupe-feu' : 'Fire separation')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Présence' : 'Present',
            bool(config.separationCoupeFeu, isFr),
          )}
          ${
            config.separationCoupeFeu
              ? infoRow(
                  isFr ? 'Emplacement' : 'Location',
                  safeVal(config.separationCoupeFeuLieu),
                )
              : ''
          }
        </tbody>
      </table>

      ${
        config.emplacementBac ||
        config.compacteur !== undefined ||
        config.chuteADechets !== undefined
          ? `
        ${subHeading(
          isFr
            ? 'Déchets et matières résiduelles'
            : 'Waste and residual materials',
        )}
        <table>
          <tbody>
            ${
              config.emplacementBac
                ? infoRow(
                    isFr
                      ? 'Emplacement bac à déchets'
                      : 'Waste bin location',
                    safeVal(config.emplacementBac),
                  )
                : ''
            }
            ${
              config.compacteur !== undefined
                ? infoRow(
                    isFr ? 'Compacteur présent' : 'Compactor present',
                    bool(config.compacteur, isFr),
                  )
                : ''
            }
            ${
              config.compacteur
                ? infoRow(
                    isFr
                      ? 'Gicleurs dans le compacteur'
                      : 'Sprinklers in compactor',
                    bool(config.compacteurGicleurs, isFr),
                  )
                : ''
            }
            ${
              config.compacteur && config.compacteurGicleurs
                ? infoRow(
                    isFr
                      ? 'Type gicleurs compacteur'
                      : 'Compactor sprinkler type',
                    safeVal(config.compacteurGicleursType),
                  )
                : ''
            }
            ${
              config.compacteur && config.compacteurGicleurs
                ? infoRow(
                    isFr
                      ? 'Vanne isolement compacteur'
                      : 'Compactor isolation valve',
                    safeVal(config.compacteurVanneIsolement),
                  )
                : ''
            }
            ${
              config.chuteADechets !== undefined
                ? infoRow(
                    isFr
                      ? 'Chute à déchets présente'
                      : 'Waste chute present',
                    bool(config.chuteADechets, isFr),
                  )
                : ''
            }
          </tbody>
        </table>
      `
          : ''
      }

      ${subHeading('CVAC')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Système CVAC présent' : 'HVAC system present',
            bool(config.cvac, isFr),
          )}
          ${
            config.cvac
              ? infoRow(
                  isFr ? 'Type de CVAC' : 'HVAC type',
                  safeVal(config.cvacType),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Emplacement' : 'Location',
            safeVal(config.cvacLocalisation),
          )}
          ${infoRow(
            isFr ? 'Type de chauffage' : 'Heating type',
            safeVal(config.typeChautfage),
          )}
          ${infoRow(
            isFr ? 'Type de refroidissement' : 'Cooling type',
            safeVal(config.typeRefroidissement),
          )}
          ${infoRow(
            isFr ? 'Désenfumage' : 'Smoke control',
            bool(config.desenfumage, isFr),
          )}
          ${
            config.desenfumage
              ? infoRow(
                  isFr
                    ? 'Emplacement désenfumage'
                    : 'Smoke control location',
                  safeVal(config.desenfumageLieu),
                )
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Gaz et combustibles' : 'Gas and fuels')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Gaz naturel présent' : 'Natural gas present',
            bool(config.gazNaturel, isFr),
          )}
          ${
            config.gazNaturel
              ? infoRow(
                  isFr
                    ? 'Localisation entrée de gaz naturel'
                    : 'Natural gas inlet location',
                  safeVal(config.gazNaturelLieu),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Propane présent' : 'Propane present',
            bool(config.propane, isFr),
          )}
          ${
            config.propane
              ? infoRow(
                  isFr ? 'Localisation du propane' : 'Propane location',
                  safeVal(config.propaneLieu),
                )
              : ''
          }
        </tbody>
      </table>

      ${
        config.registresCoupeFeu
          ? `
        <div style="break-inside:avoid;page-break-inside:avoid;">
          ${subHeading(
            isFr
              ? 'Registres coupe-feu / contrôle de la fumée'
              : 'Fire Dampers and Smoke Control Registers',
          )}
          <table>
            <tbody>
              ${
                hasValue(config.registresCoupeFeuNombre)
                  ? infoRow(
                      isFr
                        ? 'Nombre approximatif'
                        : 'Approximate count',
                      safeVal(config.registresCoupeFeuNombre),
                    )
                  : ''
              }
              ${
                config.registresCoupeFeuDerniereInspection
                  ? infoRow(
                      isFr ? 'Dernière inspection' : 'Last inspection',
                      safeVal(config.registresCoupeFeuDerniereInspection),
                    )
                  : ''
              }
              ${
                config.registresCoupeFeuRapport !== undefined
                  ? infoRow(
                      isFr ? 'Rapport disponible' : 'Report available',
                      bool(config.registresCoupeFeuRapport, isFr),
                    )
                  : ''
              }
              ${infoRow(
                isFr ? 'Fréquence requise' : 'Required frequency',
                isFr
                  ? 'Aux 12 mois — CNPI 2020 art. 2.2.2.4'
                  : 'Every 12 months — CNPI 2020 art. 2.2.2.4',
              )}
            </tbody>
          </table>
        </div>
      `
          : ''
      }

      ${subHeading(isFr ? 'Salle électrique' : 'Electrical room')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Emplacement' : 'Location',
            safeVal(config.salleElectrique),
          )}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Alimentation de secours' : 'Backup power')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Génératrice présente' : 'Generator present',
            bool(config.generatrice, isFr),
          )}
          ${
            config.generatrice
              ? `
            ${infoRow(
              isFr ? 'Nombre de génératrices' : 'Number of generators',
              safeVal(config.nbGeneratrices),
            )}
            ${infoRow(
              isFr ? 'Nom / identification' : 'Name / identification',
              safeVal(config.generatriceNom),
            )}
            ${infoRow(
              isFr ? 'Emplacement génératrice' : 'Generator location',
              safeVal(config.generatriceLieu),
            )}
            ${infoRow(
              isFr ? "Type d'alimentation" : 'Fuel type',
              safeVal(config.generatriceCarburant),
            )}
            ${infoRow(
              isFr ? 'Autonomie' : 'Runtime',
              withUnit(config.autonomieGeneratrice, ' h'),
            )}
            ${infoRow(
              isFr ? 'Capacité réservoir' : 'Tank capacity',
              withUnit(config.capaciteReservoir, ' L'),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${
        config.generatrice && config.reservoirsAuxiliaires
          ? `
        ${subHeading(isFr ? 'Réservoirs auxiliaires' : 'Auxiliary tanks')}
        <table>
          <tbody>
            ${infoRow(
              isFr ? 'Emplacement' : 'Location',
              safeVal(config.reservoirsAuxiliairesLieu),
            )}
            ${infoRow(
              isFr ? 'Capacité' : 'Capacity',
              withUnit(config.reservoirsAuxiliairesCapacite, ' L'),
            )}
            ${infoRow(
              isFr ? 'Autonomie totale' : 'Total runtime',
              withUnit(config.autonomieTotale, ' h'),
            )}
          </tbody>
        </table>
      `
          : ''
      }

      ${
        config.generatriceEquipements?.length > 0
          ? subSection(
              isFr
                ? 'Équipements sur alimentation de secours'
                : 'Equipment on backup power',
              `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
                ${config.generatriceEquipements
                  .map((e: string) => checklistItem(escapeHtml(e), true))
                  .join('')}
              </div>`,
            )
          : ''
      }

      ${
        config.generatriceEquipementsPersonnalises?.length > 0
          ? `
        ${subHeading(
          isFr ? 'Autres équipements alimentés' : 'Other powered equipment',
        )}
        <table>
          <tbody>
            ${config.generatriceEquipementsPersonnalises
              .map((e: any) =>
                e?.nom ? infoRow('', escapeHtml(e.nom)) : '',
              )
              .join('')}
          </tbody>
        </table>
      `
          : ''
      }

      <div style="break-inside:avoid;page-break-inside:avoid;">
        ${subHeading(isFr ? "Vannes d'arrêt" : 'Shutoff valves')}
        <table>
          <tbody>
            ${
              config.vannesArretSalleGicleurs
                ? infoRow(
                    isFr ? 'Salle de gicleurs' : 'Sprinkler room',
                    safeVal(config.vannesArretSalleGicleurs),
                  )
                : ''
            }
            ${
              config.vannesArretGazNaturel
                ? infoRow(
                    isFr
                      ? 'Entrée de gaz naturel'
                      : 'Natural gas inlet',
                    safeVal(config.vannesArretGazNaturel),
                  )
                : ''
            }
            ${
              config.vannesArretEauDomestique
                ? infoRow(
                    isFr
                      ? 'Arrivée eau domestique'
                      : 'Domestic water supply',
                    safeVal(config.vannesArretEauDomestique),
                  )
                : ''
            }
            ${
              config.vannesArretSalleElectrique
                ? infoRow(
                    isFr ? 'Salle électrique' : 'Electrical room',
                    safeVal(config.vannesArretSalleElectrique),
                  )
                : ''
            }
          </tbody>
        </table>
      </div>
    </div>
  `;

  // ============================================================
  // 7.3 — RÉSEAU D'ALARME INCENDIE
  // ============================================================

  const relaisItems = [
    {
      key: 'teleSurveillance',
      fr: "Appel à la centrale d'alarme",
      en: 'Call to monitoring station',
    },
    {
      key: 'arretVentilation',
      fr: 'Arrêt de la ventilation',
      en: 'Ventilation shutdown',
    },
    {
      key: 'rappelAscenseurs',
      fr: 'Rappel des ascenseurs',
      en: 'Elevator recall',
    },
    {
      key: 'desenfumageAutomatique',
      fr: 'Système de désenfumage',
      en: 'Smoke control system',
    },
    {
      key: 'deverrouillagePorces',
      fr: "Déverrouillage des zones à accès contrôlé",
      en: 'Access-controlled door unlocking',
    },
    {
      key: 'fermeturePortesCoupeFeu',
      fr: 'Fermeture des portes coupe-feu',
      en: 'Fire door closing',
    },
  ];

  const detectionItems = [
    {
      key: 'stationManuelle',
      fr: "Station manuelle d'alarme incendie",
      en: 'Manual fire alarm station',
    },
    {
      key: 'detecteurChaleur',
      fr: 'Détecteur de chaleur',
      en: 'Heat detector',
    },
    {
      key: 'detecteurFumee',
      fr: 'Détecteur de fumée',
      en: 'Smoke detector',
    },
    {
      key: 'detecteurDebitGicleurs',
      fr: 'Détecteur de débit de gicleurs',
      en: 'Sprinkler flow detector',
    },
  ];

  const html73 = `
    <div class="page-break">
      ${sectionHeader(
        '7.3',
        isFr ? "RÉSEAU D'ALARME INCENDIE" : 'FIRE ALARM SYSTEM',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr
              ? "Panneau d'alarme incendie présent"
              : 'Fire alarm panel present',
            bool(config.panneauAlarme, isFr),
          )}
          ${infoRow(
            isFr ? 'Localisation du panneau' : 'Panel location',
            safeVal(config.panneauLocalisation),
          )}
          ${infoRow(
            isFr ? 'Marque / Modèle' : 'Brand / Model',
            `${safeVal(config.panneauMarque, '')} ${safeVal(
              config.panneauModele,
              '',
            )}`.trim() || '—',
          )}
          ${infoRow(
            isFr ? 'Type' : 'Type',
            safeVal(config.panneauType),
          )}
          ${infoRow(
            isFr ? 'Technologie' : 'Technology',
            safeVal(config.panneauTechno),
          )}
          ${
            config.panneauType === 'DOUBLE'
              ? infoRow(
                  isFr
                    ? 'Heures de fonctionnement — double étape'
                    : 'Double-stage operating hours',
                  safeVal(config.heuresFonctionnement),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Panneau annonciateur' : 'Annunciator panel',
            bool(config.panneauAnnonciateurDistance, isFr),
          )}
          ${
            config.panneauAnnonciateurDistance
              ? infoRow(
                  isFr
                    ? 'Emplacement annonciateur'
                    : 'Annunciator location',
                  safeVal(config.panneauAnnonciateurLieu),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Téléphone pompier' : 'Firefighter phone',
            bool(config.telephonePompier, isFr),
          )}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Télésurveillance' : 'Monitoring')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Télésurveillance' : 'Monitoring service',
            bool(config.teleSurveillance, isFr),
          )}
          ${
            config.teleSurveillance
              ? `
            ${infoRow(
              isFr
                ? 'Centrale de surveillance'
                : 'Monitoring station',
              safeVal(config.centraleSurveillance),
            )}
            ${infoRow(
              isFr
                ? 'Téléphone de la centrale'
                : 'Monitoring station phone',
              safeVal(config.centraleTelephone),
            )}
            ${infoRow(
              isFr ? 'Code client' : 'Client code',
              safeVal(config.centraleCodeClient),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${subHeading(
        isFr ? "Communications d'urgence" : 'Emergency communications',
      )}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Communication phonique' : 'Voice communication',
            bool(config.systemePhonic, isFr),
          )}
          ${
            config.systemePhonic
              ? infoRow(
                  isFr
                    ? 'Type de système phonique'
                    : 'Voice communication type',
                  safeVal(config.systemePhonicType),
                )
              : ''
          }
          ${
            config.systemePhonic
              ? infoRow(
                  isFr ? 'Messages automatisés' : 'Automated messages',
                  bool(config.messagesAutomatises, isFr),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Radios de communication' : 'Communication radios',
            bool(config.radiosCommunication, isFr),
          )}
          ${
            config.radiosCommunication
              ? infoRow(
                  isFr ? 'Nombre de radios' : 'Number of radios',
                  safeVal(config.nbRadios),
                )
              : ''
          }
          ${infoRow(
            isFr ? "Intercom d'urgence" : 'Emergency intercom',
            bool(config.intercomUrgence, isFr),
          )}
        </tbody>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:16px;">
        <div>
          ${subHeading(isFr ? 'Relais auxiliaires' : 'Auxiliary relays')}
          ${relaisItems
            .map(item =>
              checklistItem(
                isFr ? item.fr : item.en,
                !!config[item.key],
              ),
            )
            .join('')}
        </div>

        <div>
          ${subHeading(
            isFr ? 'Éléments de détection' : 'Detection elements',
          )}
          ${detectionItems
            .map(item =>
              checklistItem(
                isFr ? item.fr : item.en,
                !!config[item.key],
              ),
            )
            .join('')}
        </div>
      </div>

      ${
        (config.s1001Interconnexions || []).length > 0
          ? `
        ${subHeading(
          isFr
            ? 'Systèmes intégrés — CAN/ULC-S1001'
            : 'Integrated Systems — CAN/ULC-S1001',
        )}

        <div style="background:#F4ECF7;border-left:4px solid #8E44AD;border-radius:0 4px 4px 0;padding:10px 14px;margin-bottom:10px;">
          <p style="margin:0;font-size:9pt;color:#8E44AD;font-weight:600;">
            ${
              isFr
                ? '⚠ Bâtiments existants : essais intégrés requis à compter du 17 avril 2028 (art. 2.1.3.7)'
                : '⚠ Existing buildings: integrated testing required as of April 17, 2028 (art. 2.1.3.7)'
            }
          </p>
        </div>

        <table>
          <tbody>
            ${infoRow(
              isFr ? 'Interconnexions déclarées' : 'Declared interconnections',
              listVal(config.s1001Interconnexions),
            )}
            ${
              config.s1001DernierEssai
                ? infoRow(
                    isFr ? 'Dernier essai intégré' : 'Last integrated test',
                    safeVal(config.s1001DernierEssai),
                  )
                : ''
            }
            ${
              config.s1001RapportDisponible !== undefined
                ? infoRow(
                    isFr ? 'Rapport disponible' : 'Report available',
                    bool(config.s1001RapportDisponible, isFr),
                  )
                : ''
            }
            ${
              config.s1001Coordonnateur
                ? infoRow(
                    isFr
                      ? 'Coordonnateur des essais'
                      : 'Test coordinator',
                    safeVal(config.s1001Coordonnateur),
                  )
                : ''
            }
          </tbody>
        </table>
      `
          : ''
      }
    </div>
  `;

  // ============================================================
  // 7.4 — GICLEURS ET PROTECTION INCENDIE
  // ============================================================

  const gicleursSystemesRows = (config.gicleursSystemes || [])
    .map(
      (s: any) => `
      <tr>
        <td style="font-weight:600;">${safeVal(s.type)}</td>
        <td>${safeVal(s.lieu)}</td>
        <td style="text-align:center;">${bool(s.complet, isFr)}</td>
      </tr>
    `,
    )
    .join('');

  const html74 = `
    <div class="page-break">
      ${sectionHeader(
        '7.4',
        isFr
          ? 'SYSTÈME DE GICLEURS ET PROTECTION INCENDIE'
          : 'SPRINKLER AND FIRE PROTECTION SYSTEM',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Réseau de gicleurs' : 'Sprinkler network',
            bool(config.gicleurs, isFr),
          )}
          ${
            config.gicleurs
              ? infoRow(
                  isFr
                    ? 'Localisation salle des gicleurs'
                    : 'Sprinkler room location',
                  safeVal(salleGicleursLieu),
                )
              : ''
          }
        </tbody>
      </table>

      ${
        config.gicleurs && config.gicleursSystemes?.length > 0
          ? `
        ${subHeading(isFr ? 'Systèmes de gicleurs' : 'Sprinkler systems')}
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Type de réseau' : 'Network type'}</th>
              <th>${
                isFr
                  ? 'Secteurs / lieux desservis'
                  : 'Covered areas / sectors'
              }</th>
              <th style="text-align:center;">${
                isFr ? 'Couverture complète' : 'Complete coverage'
              }</th>
            </tr>
          </thead>
          <tbody>${gicleursSystemesRows}</tbody>
        </table>
      `
          : ''
      }

      ${
        config.gicleurs
          ? `
        ${subHeading(
          isFr ? 'Équipements du réseau' : 'System equipment',
        )}
        <table>
          <tbody>
            ${infoRow(
              isFr ? 'Pompe incendie' : 'Fire pump',
              bool(config.pompeIncendie, isFr),
            )}
            ${
              config.pompeIncendie
                ? infoRow(
                    isFr ? 'Localisation pompe' : 'Pump location',
                    safeVal(config.pompeIncendieLieu),
                  )
                : ''
            }
            ${
              config.pompeIncendie && hasValue(config.gapmUsgpm)
                ? infoRow(
                    isFr
                      ? 'Débit (GAPM/USGPM)'
                      : 'Flow rate (GAPM/USGPM)',
                    safeVal(config.gapmUsgpm),
                  )
                : ''
            }

            ${infoRow(
              isFr ? 'Boyau incendie' : 'Fire hose',
              bool(config.boyauIncendie, isFr),
            )}
            ${infoRow(
              isFr ? 'Cabinet de boyau' : 'Fire hose cabinet',
              bool(config.boyauCabinet, isFr),
            )}
            ${infoRow(
              isFr ? 'Prise de refoulement' : 'Standpipe outlet',
              bool(config.priseRefoulement, isFr),
            )}
            ${infoRow(
              isFr ? 'Raccord pompier' : 'Fire department connection',
              bool(config.raccordPompier, isFr),
            )}
            ${
              config.raccordPompier
                ? infoRow(
                    isFr
                      ? 'Emplacement raccord pompier'
                      : 'Fire department connection location',
                    safeVal(config.raccordPompierLieu),
                  )
                : ''
            }
            ${infoRow(
              isFr ? 'Bornes-fontaines' : 'Fire hydrants',
              bool(config.bornesFontaine, isFr),
            )}
            ${
              config.bornesFontaine
                ? infoRow(
                    isFr
                      ? 'Emplacement bornes-fontaines'
                      : 'Fire hydrant location',
                    safeVal(config.bornesFontaineLieu),
                  )
                : ''
            }
            ${infoRow(
              isFr ? "Vannes d'isolement de zone" : 'Zone isolation valves',
              bool(config.vannesIsolement, isFr),
            )}
            ${
              config.vannesIsolement
                ? infoRow(
                    isFr ? 'Emplacement vannes' : 'Valve location',
                    safeVal(config.vannesIsolementLieu),
                  )
                : ''
            }
            ${infoRow(
              isFr ? 'Valve 2½' : '2½ valve',
              bool(config.valve2_5, isFr),
            )}
            ${
              config.valve2_5
                ? infoRow(
                    isFr
                      ? 'Valve 2½ — Localisation'
                      : '2½ valve — Location',
                    safeVal(config.valve2_5Lieu),
                  )
                : ''
            }
            ${infoRow(
              isFr ? 'Valve 1½' : '1½ valve',
              bool(config.valve1_5, isFr),
            )}
            ${
              config.valve1_5
                ? infoRow(
                    isFr
                      ? 'Valve 1½ — Localisation'
                      : '1½ valve — Location',
                    safeVal(config.valve1_5Lieu),
                  )
                : ''
            }
          </tbody>
        </table>
      `
          : ''
      }

      ${
        config.systemeExtinctionFixe ||
        config.systemePreAction ||
        config.systemeHalogen ||
        config.systemeCO2
          ? `
        ${subHeading(
          isFr
            ? "Systèmes spécialisés d'extinction"
            : 'Specialized extinguishing systems',
        )}
        <table>
          <tbody>
            ${infoRow(
              isFr
                ? "Système d'extinction fixe"
                : 'Fixed extinguishing system',
              bool(config.systemeExtinctionFixe, isFr),
            )}
            ${
              config.systemeExtinctionFixe
                ? infoRow(
                    isFr ? 'Emplacement — système fixe' : 'Location — fixed system',
                    safeVal(config.systemeExtinctionFixeLieu),
                  )
                : ''
            }

            ${infoRow(
              isFr ? 'Système préaction' : 'Pre-action system',
              bool(config.systemePreAction, isFr),
            )}
            ${
              config.systemePreAction
                ? infoRow(
                    isFr ? 'Emplacement — préaction' : 'Location — pre-action',
                    safeVal(config.systemePreActionLieu),
                  )
                : ''
            }

            ${infoRow(
              isFr ? 'Système halogéné' : 'Halogen system',
              bool(config.systemeHalogen, isFr),
            )}
            ${
              config.systemeHalogen
                ? infoRow(
                    isFr
                      ? 'Emplacement — système halogéné'
                      : 'Location — halogen system',
                    safeVal(config.systemeHalogenLieu),
                  )
                : ''
            }

            ${infoRow(
              isFr ? 'Système CO₂' : 'CO₂ system',
              bool(config.systemeCO2, isFr),
            )}
            ${
              config.systemeCO2
                ? infoRow(
                    isFr ? 'Emplacement — système CO₂' : 'Location — CO₂ system',
                    safeVal(config.systemeCO2Lieu),
                  )
                : ''
            }
          </tbody>
        </table>
      `
          : ''
      }
    </div>
  `;

  // ============================================================
  // 7.5 — MATIÈRES DANGEREUSES
  // ============================================================

  const matieresRows = (config.matieresList || [])
    .map(
      (m: any) => `
      <tr>
        <td style="font-weight:600;">${safeVal(m.nom)}</td>
        <td>${safeVal(m.numeroUN)}</td>
        <td>${safeVal(m.utilisation)}</td>
        <td>${safeVal(m.emplacementPrecis || m.quantiteEmplacement)}</td>
        <td>${safeVal(m.quantiteMax)}</td>
        <td style="text-align:center;">${
          m.tmd === true ? '✓' : m.tmd === false ? '✗' : '—'
        }</td>
        <td style="text-align:center;">${
          m.simdut === true ? '✓' : m.simdut === false ? '✗' : '—'
        }</td>
        <td style="text-align:center;font-weight:700;color:${
          m.signalisationTMD === true
            ? '#27AE60'
            : m.signalisationTMD === false
              ? '#C0392B'
              : '#ADB5BD'
        };">
          ${
            m.signalisationTMD === true
              ? '✓'
              : m.signalisationTMD === false
                ? '✗'
                : '—'
          }
        </td>
      </tr>
    `,
    )
    .join('');

  const html75 = `
    <div class="page-break">
      ${sectionHeader(
        '7.5',
        isFr ? 'MATIÈRES DANGEREUSES' : 'HAZARDOUS MATERIALS',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr
              ? 'Matières dangereuses présentes'
              : 'Hazardous materials present',
            bool(config.matieresDangereuses, isFr),
          )}
        </tbody>
      </table>

      ${
        config.matieresList?.length > 0
          ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Nom du produit' : 'Product name'}</th>
              <th>${isFr ? 'No UN' : 'UN No.'}</th>
              <th>${isFr ? 'Utilisation' : 'Use'}</th>
              <th>${isFr ? 'Emplacement précis' : 'Exact location'}</th>
              <th>${isFr ? 'Qté max' : 'Max qty'}</th>
              <th>TMD</th>
              <th>SIMDUT</th>
              <th>${isFr ? 'Signal. TMD' : 'TMD Sign.'}</th>
            </tr>
          </thead>
          <tbody>${matieresRows}</tbody>
        </table>
      `
          : `<p style="color:#ADB5BD;">${
              isFr
                ? 'Aucune matière dangereuse déclarée'
                : 'No hazardous materials declared'
            }</p>`
      }

      ${
        config.psiEntreePrincipale !== undefined
          ? `
        <div style="background:${
          config.psiEntreePrincipale ? '#EAFAF1' : '#FDEDEC'
        };border-left:4px solid ${
          config.psiEntreePrincipale ? '#27AE60' : '#C0392B'
        };border-radius:0 4px 4px 0;padding:10px 14px;margin:12px 0;">
          <p style="margin:0;font-size:9pt;font-weight:700;color:${
            config.psiEntreePrincipale ? '#27AE60' : '#C0392B'
          };">
            ${
              config.psiEntreePrincipale
                ? isFr
                  ? "✓ PSI conservé et accessible à l'entrée principale (CNPI 2020 art. 2.8.2.12)"
                  : '✓ Fire safety plan stored and accessible at main entrance (CNPI 2020 art. 2.8.2.12)'
                : isFr
                  ? "✗ PSI non accessible à l'entrée principale — CNPI 2020 art. 2.8.2.12"
                  : '✗ Fire safety plan not accessible at main entrance — CNPI 2020 art. 2.8.2.12'
            }
          </p>
        </div>
      `
          : ''
      }

      <table>
        <tbody>
          ${
            config.ammoniac !== undefined
              ? infoRow(
                  isFr ? 'Ammoniac présent' : 'Ammonia present',
                  bool(config.ammoniac, isFr),
                )
              : ''
          }
          ${
            config.batteriesLithium !== undefined
              ? infoRow(
                  isFr
                    ? 'Batteries lithium présentes'
                    : 'Lithium batteries present',
                  bool(config.batteriesLithium, isFr),
                )
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Trousse de déversement' : 'Spill kit')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Présente' : 'Present',
            bool(config.trousseDeversement, isFr),
          )}
          ${
            config.trousseDeversementListe?.length > 0
              ? config.trousseDeversementListe
                  .map((t: any, idx: number) =>
                    infoRow(
                      isFr
                        ? `Emplacement ${idx + 1}`
                        : `Location ${idx + 1}`,
                      safeVal(t.lieu),
                    ),
                  )
                  .join('')
              : config.trousseDeversementLieu
                ? infoRow(
                    isFr ? 'Emplacement' : 'Location',
                    safeVal(config.trousseDeversementLieu),
                  )
                : ''
          }
        </tbody>
      </table>
    </div>
  `;

  // ============================================================
  // 7.6 — EXTINCTEURS PORTATIFS
  // ============================================================

  const extincteursRows = (config.extincteursList || [])
    .map(
      (ex: any) => `
      <tr>
        <td style="font-weight:600;">${safeVal(ex.type)}</td>
        <td>${safeVal(ex.lieu)}</td>
      </tr>
    `,
    )
    .join('');

  const procedureSteps = isFr
    ? [
        {
          label: 'Alerte',
          text: 'Prévenez immédiatement les occupants à proximité.',
        },
        {
          label: 'Avertisseur',
          text: "Activez la station manuelle d'alarme incendie la plus proche.",
        },
        {
          label: 'Sécurité personnelle',
          text: "Assurez-vous que votre sécurité n'est pas en danger.",
        },
        {
          label: 'Préparation',
          text: "Retirez l'extincteur de son support.",
        },
        {
          label: 'Positionnement',
          text: 'Placez-vous entre le feu et une sortie pour assurer une voie de fuite.',
        },
        {
          label: 'Approche',
          text: 'Avancez à une distance de 2-3 mètres (6-10 pieds) du feu.',
        },
        {
          label: 'Activation',
          text: 'Retirez la goupille en la tournant et en la tirant pour briser le scellé.',
        },
        {
          label: 'Ciblage',
          text: 'Tenez le boyau (si présent) et dirigez-le vers la base des flammes.',
        },
        {
          label: 'Extinction',
          text: 'Appuyez sur le levier et faites des mouvements de balayage de va-et-vient à la base des flammes, couvrant toute la largeur du feu.',
        },
        {
          label: 'Départ',
          text: "Déposez l'extincteur au bas du mur et évacuez par la sortie la plus proche.",
        },
        {
          label: 'Point de rassemblement',
          text: 'Rejoignez le point de rassemblement extérieur pour un comptage sécuritaire.',
        },
      ]
    : [
        {
          label: 'Alert',
          text: 'Immediately warn occupants nearby.',
        },
        {
          label: 'Alarm',
          text: 'Activate the nearest manual fire alarm station.',
        },
        {
          label: 'Personal safety',
          text: 'Make sure your own safety is not at risk.',
        },
        {
          label: 'Preparation',
          text: 'Remove the extinguisher from its mount.',
        },
        {
          label: 'Positioning',
          text: 'Stand between the fire and an exit to ensure an escape route.',
        },
        {
          label: 'Approach',
          text: 'Move to a distance of 2-3 meters (6-10 feet) from the fire.',
        },
        {
          label: 'Activation',
          text: 'Pull the pin by twisting and pulling to break the seal.',
        },
        {
          label: 'Aiming',
          text: 'Hold the hose (if present) and aim it at the base of the flames.',
        },
        {
          label: 'Extinguishing',
          text: 'Squeeze the lever and sweep side to side at the base of the flames, covering the full width of the fire.',
        },
        {
          label: 'Departure',
          text: 'Set the extinguisher down at the base of the wall and evacuate via the nearest exit.',
        },
        {
          label: 'Assembly point',
          text: 'Join the outdoor assembly point for a safety headcount.',
        },
      ];

  const procedureStepsHtml = procedureSteps
    .map(
      (step: any) =>
        `<li><strong>${step.label}</strong> : ${step.text}</li>`,
    )
    .join('');

  const pictosHtml = `
    <img
      src="${PASS_EXTINGUISHER_IMAGE}"
      style="width:100%;max-width:480px;display:block;margin:0 auto;"
    />
  `;

  const html76 = `
    <div class="page-break">
      ${sectionHeader(
        '7.6',
        isFr ? 'EXTINCTEURS PORTATIFS' : 'PORTABLE FIRE EXTINGUISHERS',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr
              ? 'Extincteurs portatifs présents'
              : 'Portable fire extinguishers present',
            bool(config.extincteurPortatif, isFr),
          )}
        </tbody>
      </table>

      ${
        config.extincteurPortatif
          ? `
        ${subHeading(isFr ? 'Utilisation' : 'Usage')}
        <ol style="margin:8px 0;padding-left:22px;">
          ${procedureStepsHtml}
        </ol>

        <div style="display:flex;justify-content:center;gap:24px;margin:16px 0 24px 0;">
          ${pictosHtml}
        </div>

        ${subHeading(isFr ? 'Localisation' : 'Location')}

        ${
          config.extincteursList?.length > 0
            ? `
          <table>
            <thead>
              <tr>
                <th>${
                  isFr ? "Type d'extincteur" : 'Extinguisher type'
                }</th>
                <th>${isFr ? 'Localisation' : 'Location'}</th>
              </tr>
            </thead>
            <tbody>${extincteursRows}</tbody>
          </table>
        `
            : `<p style="color:#ADB5BD;">${
                isFr
                  ? 'Aucun extincteur détaillé'
                  : 'No extinguisher details declared'
              }</p>`
        }
      `
          : ''
      }
    </div>
  `;

  // ============================================================
  // 7.7 — PREMIERS SOINS
  // ============================================================

  const soinsRows = (config.equipementsSoins || [])
    .map(
      (eq: any) => `
      <tr>
        <td style="font-weight:600;">${safeVal(eq.type)}</td>
        <td style="text-align:center;">${safeVal(eq.quantite)}</td>
        <td>${safeVal(eq.lieu)}</td>
      </tr>
    `,
    )
    .join('');

  const html77 = `
    <div class="page-break">
      ${sectionHeader(
        '7.7',
        isFr
          ? 'ÉQUIPEMENTS DE PREMIERS SOINS'
          : 'FIRST AID EQUIPMENT',
      )}

      ${
        config.equipementsSoins?.length > 0
          ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Équipement' : 'Equipment'}</th>
              <th style="text-align:center;">${
                isFr ? 'Quantité' : 'Quantity'
              }</th>
              <th>${isFr ? 'Emplacement' : 'Location'}</th>
            </tr>
          </thead>
          <tbody>${soinsRows}</tbody>
        </table>
      `
          : `<p style="color:#ADB5BD;">${
              isFr
                ? 'Aucun équipement déclaré'
                : 'No equipment declared'
            }</p>`
      }
    </div>
  `;

  // ============================================================
  // 7.8 — DÉTECTEURS DE GAZ
  // ============================================================

  const detectors = [
    {
      label: isFr
        ? 'Détecteur de monoxyde de carbone (CO)'
        : 'Carbon Monoxide Detector (CO)',
      present: config.detecteurCO,
      seuil1: hasValue(config.detecteurCOSeuil1)
        ? `${safeVal(config.detecteurCOSeuil1)} ppm`
        : undefined,
      seuil2: hasValue(config.detecteurCOSeuil2)
        ? `${safeVal(config.detecteurCOSeuil2)} ppm`
        : undefined,
      lieu: config.detecteurCOLieu,
    },
    {
      label: isFr
        ? 'Détecteur de gaz naturel — Méthane (CH₄)'
        : 'Natural Gas Detector — Methane (CH₄)',
      present: config.detecteurGazNaturel,
      lieu: config.detecteurGazNaturelLieu,
    },
    {
      label: isFr
        ? 'Détecteur de propane (C₃H₈)'
        : 'Propane Detector (C₃H₈)',
      present: config.detecteurPropane,
    },
    {
      label: isFr
        ? "Détecteur d'ammoniac (NH₃)"
        : 'Ammonia Detector (NH₃)',
      present: config.detecteurAmmoniac,
      seuil1: hasValue(config.detecteurAmmoniacSeuil1)
        ? `${safeVal(config.detecteurAmmoniacSeuil1)} ppm`
        : undefined,
      seuil2: hasValue(config.detecteurAmmoniacSeuil2)
        ? `${safeVal(config.detecteurAmmoniacSeuil2)} ppm`
        : undefined,
    },
    {
      label: isFr ? 'Détecteur de fréon' : 'Freon Detector',
      present: config.detecteurFreon,
    },
    {
      label: isFr
        ? "Détecteur d'oxygène (O₂)"
        : 'Oxygen Detector (O₂)',
      present: config.detecteurO2,
    },
    {
      label: isFr ? 'Détecteur FM200' : 'FM200 Detector',
      present: config.detecteurFM200,
    },
    {
      label: isFr
        ? 'Détecteur de dioxyde de carbone (CO₂)'
        : 'Carbon Dioxide Detector (CO₂)',
      present: config.detecteurCO2,
    },
  ].filter(detector => detector.present);

  const detectorsHtml = detectors
    .map(
      (detector: any, idx: number) => `
      <div style="margin-bottom:16px;">
        <p style="font-size:9pt;font-weight:700;color:#495057;margin-bottom:6px;">
          ${moduleSeqNumber}.${subsectionCounter + 1}.${idx + 1} — ${
            detector.label
          }
        </p>

        <table>
          <tbody>
            ${infoRow(
              isFr ? 'Présent' : 'Present',
              bool(detector.present, isFr),
            )}
            ${
              detector.seuil1
                ? infoRow(
                    isFr
                      ? "Seuil d'activation minimal"
                      : 'Minimum activation threshold',
                    detector.seuil1,
                  )
                : ''
            }
            ${
              detector.seuil2
                ? infoRow(
                    isFr
                      ? "Seuil d'activation maximal"
                      : 'Maximum activation threshold',
                    detector.seuil2,
                  )
                : ''
            }
            ${
              detector.lieu
                ? infoRow(
                    isFr ? 'Emplacement' : 'Location',
                    safeVal(detector.lieu),
                  )
                : ''
            }
          </tbody>
        </table>
      </div>
    `,
    )
    .join('');

  const html78 = `
    <div class="page-break">
      ${sectionHeader(
        '7.8',
        isFr ? 'DÉTECTEURS DE GAZ' : 'GAS DETECTORS',
      )}

      ${
        detectors.length > 0
          ? detectorsHtml
          : `<p style="color:#ADB5BD;">${
              isFr
                ? 'Aucun détecteur de gaz déclaré'
                : 'No gas detector declared'
            }</p>`
      }
    </div>
  `;

  // ============================================================
  // 7.9 — PHOTOS
  // ============================================================

  const photoEntries = Object.entries(photos)
    .filter(([_, p]: [string, any]) => p && p.base64)
    .sort(([a], [b]) => a.localeCompare(b));

  const photoGroups: Array<Array<[string, any]>> = [];

  for (let i = 0; i < photoEntries.length; i += 6) {
    photoGroups.push(photoEntries.slice(i, i + 6) as Array<[string, any]>);
  }

  const renderPhotoGroup = (
    group: Array<[string, any]>,
  ): string => {
    const rows: string[] = [];

    for (let i = 0; i < group.length; i += 2) {
      const [, photo1] = group[i] as [string, any];
      const pair = group[i + 1];

      const cell1 = `
        <td style="width:50%;padding:6px;vertical-align:top;border:none;">
          <div style="border:1px solid #E9ECEF;border-radius:4px;overflow:hidden;">
            <div style="background-color:#C0392B;color:#FFFFFF;padding:6px 12px;font-size:9pt;font-weight:700;">
              ${escapeHtml(photo1.label || '')}
            </div>
            <img
              src="data:image/jpeg;base64,${photo1.base64}"
              style="width:100%;height:175px;object-fit:cover;display:block;"
            />
          </div>
        </td>
      `;

      const cell2 = pair
        ? `
        <td style="width:50%;padding:6px;vertical-align:top;border:none;">
          <div style="border:1px solid #E9ECEF;border-radius:4px;overflow:hidden;">
            <div style="background-color:#C0392B;color:#FFFFFF;padding:6px 12px;font-size:9pt;font-weight:700;">
              ${escapeHtml((pair[1] as any).label || '')}
            </div>
            <img
              src="data:image/jpeg;base64,${(pair[1] as any).base64}"
              style="width:100%;height:175px;object-fit:cover;display:block;"
            />
          </div>
        </td>
      `
        : '<td style="width:50%;padding:6px;border:none;"></td>';

      rows.push(
        `<tr style="page-break-inside:avoid;">${cell1}${cell2}</tr>`,
      );
    }

    return `
      <table style="width:100%;border-collapse:collapse;border:none;page-break-inside:avoid;">
        ${rows.join('')}
      </table>
    `;
  };

  const html79 = `
    <div class="page-break">
      ${sectionHeader(
        '7.9',
        isFr
          ? 'PHOTOS DES ÉQUIPEMENTS DE PROTECTION'
          : 'PROTECTION EQUIPMENT PHOTOS',
      )}

      ${
        photoEntries.length > 0
          ? photoGroups
              .map(
                (group, idx) => `
            <div style="${idx > 0 ? 'page-break-before:always;' : ''}">
              ${renderPhotoGroup(group)}
            </div>
          `,
              )
              .join('')
          : `<p style="color:#ADB5BD;">${
              isFr ? 'Aucune photo ajoutée' : 'No photos added'
            }</p>`
      }
    </div>
  `;

  // ============================================================
  // SECTION CONDITIONNELLE — TRAVAUX PAR POINTS CHAUDS
  // ============================================================

  const htmlHotWork = hasHotWork
      ? `
    <div class="page-break">
      ${sectionHeader(
        'TPC',
        isFr ? 'TRAVAUX PAR POINTS CHAUDS' : 'HOT WORK OPERATIONS',
      )}

      <div style="background:#FEF9E7;border-left:4px solid #F39C12;border-radius:0 4px 4px 0;padding:10px 14px;margin-bottom:12px;">
        <p style="margin:0;font-size:9pt;color:#F39C12;font-weight:600;">
          ${
            isFr
              ? '⚠ Inclut : soudage, découpage, meulage, brasage, toiture, dégèlement — CNPI 2020 art. 5.2'
              : '⚠ Includes: welding, cutting, grinding, brazing, roofing, pipe thawing — CNPI 2020 art. 5.2'
          }
        </p>
      </div>

      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Fréquence' : 'Frequency',
            safeVal(config.travauxPointsChauds),
          )}
          ${infoRow(
            isFr
              ? 'Permis de travail à chaud formalisé'
              : 'Formalized hot work permit',
            bool(config.permisTravauxChauds, isFr),
          )}
          ${infoRow(
            isFr
              ? 'Surveillance incendie continue'
              : 'Continuous fire watch',
            bool(config.surveillanceIncendieTPC, isFr),
          )}
          ${
            config.responsableTravauxChauds
              ? infoRow(
                  isFr ? 'Responsable désigné' : 'Designated responsible',
                  safeVal(config.responsableTravauxChauds),
                )
              : ''
          }
          ${infoRow(
            isFr
              ? 'Inspection finale documentée'
              : 'Documented final inspection',
            bool(config.inspectionFinaleDocumentee, isFr),
          )}
          ${
            config.methodeInspectionTPC
              ? infoRow(
                  isFr
                    ? "Méthode d'inspection finale"
                    : 'Final inspection method',
                  safeVal(config.methodeInspectionTPC),
                )
              : ''
          }
          ${infoRow(
            isFr
              ? 'Travaux sur toiture possibles'
              : 'Roof work possible',
            bool(config.travauxToiture, isFr),
          )}
        </tbody>
      </table>
    </div>
  `
      : '';

  // ============================================================
  // SECTION CONDITIONNELLE — LABORATOIRES
  // ============================================================

  const htmlLaboratories = config.laboratoirePresent
    ? `
    <div class="page-break">
      ${sectionHeader(
        'LABO',
        isFr ? 'LABORATOIRES' : 'LABORATORIES',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Laboratoire présent' : 'Laboratory present',
            bool(config.laboratoirePresent, isFr),
          )}
          ${
            (config.typeLaboratoire || []).length > 0
              ? infoRow(
                  isFr ? 'Type(s)' : 'Type(s)',
                  listVal(config.typeLaboratoire),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Gaz comprimés présents' : 'Compressed gas present',
            bool(config.gazComprimesPresents, isFr),
          )}
          ${
            config.gazComprimesPresents
              ? infoRow(
                  isFr
                    ? 'Armoire / cabinet ventilé disponible'
                    : 'Ventilated cabinet available',
                  bool(config.armireCabinetVentile, isFr),
                )
              : ''
          }
          ${infoRow(
            isFr ? 'Gaz toxiques présents' : 'Toxic gas present',
            bool(config.gazToxiquesPresents, isFr),
          )}
          ${
            config.gazToxiquesPresents
              ? infoRow(
                  isFr
                    ? 'Détection avec signal audible et visible'
                    : 'Detection with audible and visible signal',
                  bool(config.detectionGazLabo, isFr),
                )
              : ''
          }
          ${infoRow(
            isFr
              ? "Panneaux TMD à l'entrée du laboratoire"
              : 'TMD signs at laboratory entrance',
            bool(config.panneauxTMDLabo, isFr),
          )}
        </tbody>
      </table>

      <div style="background:#EBF5FB;border-left:4px solid #2980B9;border-radius:0 4px 4px 0;padding:10px 14px;margin-top:12px;">
        <p style="margin:0;font-size:9pt;color:#2980B9;font-weight:600;">
          ${
            isFr
              ? "ℹ Exercices d'incendie : tous les 3 mois (laboratoire hors école — CNPI 2020 art. 2.8.3.2)"
              : 'ℹ Fire drills: every 3 months (laboratory, non-educational — CNPI 2020 art. 2.8.3.2)'
          }
        </p>
      </div>
    </div>
  `
    : '';

  // ============================================================
  // SECTION CONDITIONNELLE — INSTALLATIONS INDUSTRIELLES
  // ============================================================

  const htmlIndustrial = isIndustriel
    ? `
    <div class="page-break">
      ${sectionHeader(
        'IND',
        isFr
          ? 'INSTALLATIONS INDUSTRIELLES'
          : 'INDUSTRIAL INSTALLATIONS',
      )}

      ${subHeading(isFr ? 'Espaces clos' : 'Confined spaces')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Espaces clos présents' : 'Confined spaces present',
            bool(config.espaceClos, isFr),
          )}
          ${
            config.espaceClos
              ? infoRow(
                  isFr ? 'Localisation' : 'Location',
                  safeVal(config.espaceClosLieu),
                )
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Palettiers' : 'Racking')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Palettiers présents' : 'Racking present',
            bool(palettierPresent, isFr),
          )}
          ${
            palettierPresent
              ? `
            ${infoRow(
              isFr ? 'Agencement' : 'Arrangement',
              safeVal(config.palettierAgencement),
            )}
            ${infoRow(
              isFr
                ? 'Gicleurs dans les palettiers'
                : 'In-rack sprinklers',
              bool(config.palettierGicleurs, isFr),
            )}
            ${infoRow(
              isFr ? 'Allées' : 'Aisles',
              safeVal(config.palettierAlles),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Stockage' : 'Storage')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Stockage présent' : 'Storage present',
            bool(config.stockagePresent, isFr),
          )}
          ${
            config.stockagePresent
              ? `
            ${infoRow(
              isFr ? 'Palettes' : 'Pallets',
              safeVal(config.stockagePalettes),
            )}
            ${infoRow(
              isFr
                ? 'Palettes combustibles'
                : 'Combustible pallets',
              bool(config.stockagePalettesCombustible, isFr),
            )}
            ${infoRow(
              isFr ? 'Emplacement' : 'Location',
              safeVal(config.stockageEmplacement),
            )}
            ${infoRow(
              isFr ? 'Hauteur de stockage' : 'Storage height',
              safeVal(config.stockageHauteur),
            )}
            ${infoRow(
              isFr ? 'Largeur des allées' : 'Aisle width',
              safeVal(config.stockageLargeurAllee),
            )}
            ${infoRow(
              isFr ? 'Classification' : 'Classification',
              safeVal(config.stockageClassification),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Mezzanine' : 'Mezzanine')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Mezzanine présente' : 'Mezzanine present',
            bool(mezzaninePresent, isFr),
          )}
          ${
            mezzaninePresent
              ? `
            ${infoRow(
              isFr ? 'Giclée' : 'Sprinklered',
              bool(config.mezzanineGicle, isFr),
            )}
            ${infoRow(
              isFr ? 'Encloisonnée' : 'Enclosed',
              bool(config.mezzanineEncloisonnee, isFr),
            )}
            ${infoRow(
              isFr ? 'Localisation' : 'Location',
              safeVal(config.mezzanineLieu),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${subHeading(isFr ? 'Chariots élévateurs' : 'Forklifts')}
      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Chariots présents' : 'Forklifts present',
            bool(chariotsPresent, isFr),
          )}
          ${
            chariotsPresent
              ? `
            ${infoRow(
              isFr ? 'Nombre' : 'Number',
              safeVal(config.chariotsNombre),
            )}
            ${infoRow(
              isFr ? 'Type' : 'Type',
              safeVal(config.chariotsType),
            )}
            ${infoRow(
              isFr
                ? 'Emplacement de recharge'
                : 'Charging location',
              safeVal(config.chariotsEmplacementRecharge),
            )}
          `
              : ''
          }
        </tbody>
      </table>

      ${subHeading(
        isFr ? 'Batteries lithium-ion' : 'Lithium-ion batteries',
      )}
      <table>
        <tbody>
          ${infoRow(
            isFr
              ? 'Batteries lithium-ion présentes'
              : 'Lithium-ion batteries present',
            bool(config.batteriesLithiumPresent, isFr),
          )}
          ${
            config.batteriesLithiumPresent
              ? `
            ${infoRow(
              isFr
                ? 'Local / espace dédié'
                : 'Dedicated room / area',
              bool(config.batteriesLithiumLocalEspace, isFr),
            )}
            ${
              config.batteriesLithiumLocalEspaceCommentaire
                ? infoRow(
                    isFr
                      ? 'Commentaire — local / espace'
                      : 'Comment — room / area',
                    safeVal(
                      config.batteriesLithiumLocalEspaceCommentaire,
                    ),
                  )
                : ''
            }
            ${infoRow(
              isFr ? 'Détection dédiée' : 'Dedicated detection',
              bool(config.batteriesLithiumDetection, isFr),
            )}
            ${
              config.batteriesLithiumDetectionCommentaire
                ? infoRow(
                    isFr
                      ? 'Commentaire — détection'
                      : 'Comment — detection',
                    safeVal(
                      config.batteriesLithiumDetectionCommentaire,
                    ),
                  )
                : ''
            }
            ${infoRow(
              isFr ? 'Signalisation' : 'Signage',
              bool(config.batteriesLithiumSignalisation, isFr),
            )}
            ${
              config.batteriesLithiumSignalisationCommentaire
                ? infoRow(
                    isFr
                      ? 'Commentaire — signalisation'
                      : 'Comment — signage',
                    safeVal(
                      config.batteriesLithiumSignalisationCommentaire,
                    ),
                  )
                : ''
            }
          `
              : ''
          }
        </tbody>
      </table>
    </div>
  `
    : '';

  // ============================================================
  // SECTION CONDITIONNELLE — PROCÉDÉS DANGEREUX
  // ============================================================

  const dangerousProcessRows = (config.procesDangereuxDetails || [])
    .map(
      (item: any) => `
      <tr>
        <td>${safeVal(item.procedure)}</td>
        <td>${safeVal(item.type)}</td>
        <td>${safeVal(item.risque)}</td>
        <td>${safeVal(item.mesures)}</td>
      </tr>
    `,
    )
    .join('');

  const htmlDangerousProcesses =
    isIndustriel && config.procesDangereux
      ? `
    <div class="page-break">
      ${sectionHeader(
        'PROC',
        isFr ? 'PROCÉDÉS DANGEREUX' : 'HAZARDOUS PROCESSES',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr
              ? 'Procédés dangereux présents'
              : 'Hazardous processes present',
            bool(config.procesDangereux, isFr),
          )}
        </tbody>
      </table>

      ${
        config.procesDangereuxDetails?.length > 0
          ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Procédure' : 'Procedure'}</th>
              <th>${isFr ? 'Type' : 'Type'}</th>
              <th>${isFr ? 'Risque' : 'Risk'}</th>
              <th>${isFr ? 'Mesures' : 'Measures'}</th>
            </tr>
          </thead>
          <tbody>${dangerousProcessRows}</tbody>
        </table>
      `
          : ''
      }

    </div>
  `
      : '';


  // ============================================================
  // SECTION CONDITIONNELLE — CADENASSAGE
  // Indépendante des procédés dangereux : false est une valeur explicite.
  // ============================================================

  const htmlLockout =
    config.systemeCadenassage !== undefined &&
    config.systemeCadenassage !== null
      ? `
    <div class="page-break">
      ${sectionHeader(
        'CAD',
        isFr ? 'CADENASSAGE' : 'LOCKOUT / TAGOUT',
      )}

      <table>
        <tbody>
          ${infoRow(
            isFr ? 'Système de cadenassage' : 'Lockout system',
            bool(config.systemeCadenassage, isFr),
          )}
        </tbody>
      </table>
    </div>
  `
      : '';

  // ============================================================
  // RETOUR
  // ============================================================

  return [
    {
      id: 'site_general',
      title: isFr ? 'Description générale' : 'General Description',
      html: html71,
    },
    {
      id: 'site_mecanique',
      title: isFr
        ? 'Mécanique du bâtiment'
        : 'Building Mechanical Systems',
      html: html72,
    },
    {
      id: 'site_alarme',
      title: isFr
        ? "Réseau d'alarme incendie"
        : 'Fire Alarm System',
      html: html73,
    },
    {
      id: 'site_gicleurs',
      title: isFr
        ? 'Système de gicleurs et protection incendie'
        : 'Sprinkler and Fire Protection System',
      html: html74,
    },
    {
      id: 'site_matieres',
      title: isFr ? 'Matières dangereuses' : 'Hazardous Materials',
      html: html75,
    },
    {
      id: 'site_extincteur',
      title: isFr
        ? 'Extincteurs portatifs'
        : 'Portable Fire Extinguishers',
      html: html76,
    },
    {
      id: 'site_soins',
      title: isFr
        ? 'Équipements de premiers soins'
        : 'First Aid Equipment',
      html: html77,
    },
    {
      id: 'site_detecteurs',
      title: isFr ? 'Détecteurs de gaz' : 'Gas Detectors',
      html: html78,
    },
    {
      id: 'site_photos',
      title: isFr
        ? 'Photos des équipements de protection'
        : 'Protection Equipment Photos',
      html: html79,
    },

    ...(htmlHotWork
      ? [
          {
            id: 'site_points_chauds',
            title: isFr
              ? 'Travaux par points chauds'
              : 'Hot Work Operations',
            html: htmlHotWork,
          },
        ]
      : []),

    ...(htmlLaboratories
      ? [
          {
            id: 'site_laboratoires',
            title: isFr ? 'Laboratoires' : 'Laboratories',
            html: htmlLaboratories,
          },
        ]
      : []),

    ...(htmlIndustrial
      ? [
          {
            id: 'site_industriel',
            title: isFr
              ? 'Installations industrielles'
              : 'Industrial Installations',
            html: htmlIndustrial,
          },
        ]
      : []),

    ...(htmlDangerousProcesses
      ? [
          {
            id: 'site_procedes_dangereux',
            title: isFr
              ? 'Procédés dangereux'
              : 'Hazardous Processes',
            html: htmlDangerousProcesses,
          },
        ]
      : []),

    ...(htmlLockout
      ? [
          {
            id: 'site_cadenassage',
            title: isFr ? 'Cadenassage' : 'Lockout / Tagout',
            html: htmlLockout,
          },
        ]
      : []),
  ];
}
