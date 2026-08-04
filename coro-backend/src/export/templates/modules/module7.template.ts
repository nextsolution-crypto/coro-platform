// ============================================================
// CORO — Module 7 : Description du site et équipements
// Sections 7.1 à 7.9 complètes
// ============================================================

import { PASS_EXTINGUISHER_IMAGE } from './pass-image.asset';

function val(v: any, fallback = '—'): string {
  if (v === undefined || v === null || v === '' || v === false || v === 0) return fallback;
  return String(v);
}

function bool(v: any, isFr: boolean): string {
  if (v === true) return isFr ? 'Oui' : 'Yes';
  if (v === false) return isFr ? 'Non' : 'No';
  return '—';
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
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
  return `<p style="font-size:9pt;font-weight:700;color:#C0392B;text-transform:uppercase;letter-spacing:0.5px;margin:18px 0 6px 0;">${text}</p>`;
}

export function renderModule7(module7Data: any, config: any, lang: 'fr' | 'en', moduleSeqNumber: number = 7): { id: string; title: string; html: string }[] {
  const isFr = lang === 'fr';
  config = config || {};
  const extra = module7Data?.extraData || {};
  const quarts = module7Data?.quartsData || {};
  const photos = module7Data?.photosData || {};

  const isIndustriel = config.buildingType === 'Industriel' || config.usagePrincipal?.startsWith('F');

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

  const quartsOccupation = config.quartsOccupation || [];

  const quartsRows = quartsOccupation.map((q: any) => `
    <tr>
      <td style="font-weight:600;">${q.nomQuart || '—'} (${q.heureDebut || '—'} – ${q.heureFin || '—'})</td>
      <td style="text-align:center;">${val(q.occupantsSemaine)}</td>
      <td style="text-align:center;">${val(q.occupantsSamedi)}</td>
      <td style="text-align:center;">${val(q.occupantsDimanche)}</td>
    </tr>
  `).join('');

  const html71 = `
    <div>
      ${sectionHeader('7.1', isFr ? 'DESCRIPTION GÉNÉRALE' : 'GENERAL DESCRIPTION')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Usage principal' : 'Primary use', val(config.usagePrincipal))}
          ${infoRow(isFr ? 'Usage secondaire' : 'Secondary use', val(config.usageSecondaire))}
          ${infoRow(isFr ? 'Nombre de sous-sols' : 'Number of basements', val(config.basements, '0'))}
          ${infoRow(isFr ? 'Nombre d\'étages' : 'Number of floors', val(config.floors, '0'))}
          ${infoRow(isFr ? '13e étage présent' : '13th floor present', bool(config.treizeEtage, isFr))}
          ${infoRow(isFr ? 'Grande hauteur (+18m)' : 'High-rise (+18m)', bool(config.hauteurBatiment, isFr))}
          ${infoRow(isFr ? 'Construction — Étages supérieurs' : 'Construction — Upper floors', val(config.typeConstructionEtages))}
          ${infoRow(isFr ? 'Construction — Toit' : 'Construction — Roof', val(config.typeConstructionToit))}
          ${infoRow(isFr ? 'Année de construction' : 'Year built', val(config.anneeConstruction))}
          ${infoRow(isFr ? 'Dernière rénovation majeure' : 'Last major renovation', val(config.derniereRenovation))}
          ${infoRow(isFr ? 'Superficie (pi²)' : 'Area (sq ft)', val(config.superficie))}
          ${config.infosBatiment ? infoRow(isFr ? 'Informations supplémentaires' : 'Additional information', val(config.infosBatiment)) : ''}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Accès' : 'Access')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Accès aux sous-sols' : 'Basement access', Array.isArray(config.accesSousSol) && config.accesSousSol.length > 0 ? config.accesSousSol.join(', ') : '—')}
          ${config.accesSousSolDetails ? infoRow(isFr ? 'Détails accès sous-sol' : 'Basement access details', val(config.accesSousSolDetails)) : ''}
          ${infoRow(isFr ? 'Accès aux étages' : 'Floor access', Array.isArray(config.accesEtages) && config.accesEtages.length > 0 ? config.accesEtages.join(', ') : '—')}
          ${config.accesEtagesDetails ? infoRow(isFr ? 'Détails accès étages' : 'Floor access details', val(config.accesEtagesDetails)) : ''}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Emplacements' : 'Locations')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Poste de commandement' : 'Command post', val(config.posteCommandement))}
          ${infoRow(isFr ? 'Point de rassemblement principal' : 'Main assembly point', val(config.pointRassemblement))}
          ${config.pointRassemblement_snapshot ? `
            <tr>
              <td colspan="2" style="padding:8px;">
                <img src="${config.pointRassemblement_snapshot}" 
                  style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;border:1px solid #DEE2E6;" />
                <p style="font-size:8pt;color:#6C757D;margin-top:4px;font-style:italic;">
                  ${config.pointRassemblement_coords ? `📍 ${config.pointRassemblement_coords.lat.toFixed(6)}, ${config.pointRassemblement_coords.lng.toFixed(6)}` : ''}
                </p>
              </td>
            </tr>
          ` : ''}
          ${config.pointRassemblement2 ? infoRow(isFr ? 'Point de rassemblement secondaire' : 'Secondary assembly point', val(config.pointRassemblement2)) : ''}
          ${config.pointRassemblement2_snapshot ? `
            <tr>
              <td colspan="2" style="padding:8px;">
                <img src="${config.pointRassemblement2_snapshot}" 
                  style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;border:1px solid #DEE2E6;" />
                <p style="font-size:8pt;color:#6C757D;margin-top:4px;font-style:italic;">
                  ${config.pointRassemblement2_coords ? `📍 ${config.pointRassemblement2_coords.lat.toFixed(6)}, ${config.pointRassemblement2_coords.lng.toFixed(6)}` : ''}
                </p>
              </td>
            </tr>
          ` : ''}
          ${config.lieuAccueilTemporaire ? infoRow(isFr ? 'Lieu d\'accueil temporaire' : 'Temporary shelter location', val(config.lieuAccueilTemporaire)) : ''}
          ${config.lieuAccueilTemporaire_snapshot ? `
            <tr>
              <td colspan="2" style="padding:8px;">
                <img src="${config.lieuAccueilTemporaire_snapshot}" 
                  style="max-width:100%;max-height:300px;object-fit:contain;border-radius:4px;border:1px solid #DEE2E6;" />
                <p style="font-size:8pt;color:#6C757D;margin-top:4px;font-style:italic;">
                  ${config.lieuAccueilTemporaire_coords ? `📍 ${config.lieuAccueilTemporaire_coords.lat.toFixed(6)}, ${config.lieuAccueilTemporaire_coords.lng.toFixed(6)}` : ''}
                </p>
              </td>
            </tr>
          ` : ''}
          ${infoRow(isFr ? 'Trousseau de clés pompier' : 'Fire department key box', bool(config.trousseClesPompier, isFr))}
          ${config.trousseClesPompierLieu ? infoRow(isFr ? 'Localisation trousseau pompier' : 'Fire key box location', val(config.trousseClesPompierLieu)) : ''}
          ${config.lieuDocument ? infoRow(isFr ? 'Lieu de conservation du document' : 'Document storage location', val(config.lieuDocument)) : ''}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Occupation des lieux' : 'Building occupancy')}
      ${quartsOccupation.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Quart de travail' : 'Shift'}</th>
              <th style="text-align:center;">${isFr ? 'Semaine' : 'Weekday'}</th>
              <th style="text-align:center;">${isFr ? 'Samedi' : 'Saturday'}</th>
              <th style="text-align:center;">${isFr ? 'Dimanche' : 'Sunday'}</th>
            </tr>
          </thead>
          <tbody>${quartsRows}</tbody>
        </table>
      ` : `<p style="color:#ADB5BD;">${isFr ? 'Aucun quart de travail déclaré' : 'No work shift declared'}</p>`}
      ${quarts.infosSup ? `<p style="margin-top:8px;font-size:10pt;color:#495057;"><strong>${isFr ? 'Informations supplémentaires' : 'Additional information'} :</strong> ${escapeHtml(quarts.infosSup)}</p>` : ''}
    </div>
  `;

  const html72 = `
    <div class="page-break">
      ${sectionHeader('7.2', isFr ? 'MÉCANIQUE DU BÂTIMENT' : 'BUILDING MECHANICAL SYSTEMS')}

      ${subHeading(isFr ? 'Ascenseurs' : 'Elevators')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Type' : 'Type', val(config.typeAscenseur))}
          ${infoRow(isFr ? 'Emplacement salle mécanique' : 'Mechanical room location', val(config.salleAscenseur))}
          ${infoRow(isFr ? 'Rappel d\'ascenseurs' : 'Elevator recall', val(config.rappelAscenseursLieu))}
          ${infoRow(isFr ? 'Ascenseur pompier' : 'Firefighter elevator', bool(config.ascenseurPompier, isFr))}
          ${infoRow(isFr ? 'Alimentation de secours' : 'Backup power supply', bool(config.fonctionneSecours, isFr))}
          ${infoRow(isFr ? 'Téléphone dans les ascenseurs' : 'Phone in elevators', bool(config.telephoneAscenseurs, isFr))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Escaliers' : 'Stairwells')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Escaliers pressurisés' : 'Pressurized stairwells', bool(config.escaliersPressurises, isFr))}
          ${infoRow(isFr ? 'Nombre d\'escaliers' : 'Number of stairwells', val(config.nbEscaliers))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Toit' : 'Roof')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Toit verrouillé' : 'Locked roof access', bool(config.toitVerrouille, isFr))}
          ${infoRow(isFr ? 'Accès au toit' : 'Roof access', val(config.accesToit))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Séparation coupe-feu' : 'Fire separation')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Présence' : 'Present', bool(config.separationCoupeFeu, isFr))}
          ${infoRow(isFr ? 'Emplacement' : 'Location', val(config.separationCoupeFeuLieu))}
        </tbody>
      </table>

      ${config.emplacementBac || config.compacteur || config.chuteADechets ? `
        ${subHeading(isFr ? 'Déchets et matières résiduelles' : 'Waste and residual materials')}
        <table><tbody>
          ${config.emplacementBac ? infoRow(isFr ? 'Emplacement bac à déchets' : 'Waste bin location', val(config.emplacementBac)) : ''}
          ${infoRow(isFr ? 'Compacteur présent' : 'Compactor present', bool(config.compacteur, isFr))}
          ${config.compacteur ? infoRow(isFr ? 'Gicleurs dans le compacteur' : 'Sprinklers in compactor', bool(config.compacteurGicleurs, isFr)) : ''}
          ${config.compacteur && config.compacteurGicleurs ? infoRow(isFr ? 'Type gicleurs compacteur' : 'Compactor sprinkler type', val(config.compacteurGicleursType)) : ''}
          ${config.compacteur && config.compacteurGicleurs ? infoRow(isFr ? 'Vanne isolement compacteur' : 'Compactor isolation valve', val(config.compacteurVanneIsolement)) : ''}
          ${infoRow(isFr ? 'Chute à déchets présente' : 'Waste chute present', bool(config.chuteADechets, isFr))}
        </tbody></table>
      ` : ''}

      ${subHeading('CVAC')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Emplacement' : 'Location', val(config.cvacLocalisation))}
          ${infoRow(isFr ? 'Type de chauffage' : 'Heating type', val(config.typeChautfage))}
          ${infoRow(isFr ? 'Type de refroidissement' : 'Cooling type', val(config.typeRefroidissement))}
          ${infoRow(isFr ? 'Désenfumage' : 'Smoke control', bool(config.desenfumage, isFr))}
          ${infoRow(isFr ? 'Emplacement désenfumage' : 'Smoke control location', val(config.desenfumageLieu))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Gaz naturel' : 'Natural gas')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Présent' : 'Present', bool(config.gazNaturel, isFr))}
          ${infoRow(isFr ? 'Localisation entrée de gaz' : 'Gas inlet location', val(config.gazNaturelLieu))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Salle électrique' : 'Electrical room')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Emplacement' : 'Location', val(config.salleElectrique))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Alimentation de secours' : 'Backup power')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Génératrice présente' : 'Generator present', bool(config.generatrice, isFr))}
          ${infoRow(isFr ? 'Emplacement génératrice' : 'Generator location', val(config.generatriceLieu))}
          ${infoRow(isFr ? 'Type d\'alimentation' : 'Fuel type', val(config.generatriceCarburant))}
          ${infoRow(isFr ? 'Autonomie' : 'Runtime', config.autonomieGeneratrice ? `${config.autonomieGeneratrice}h` : '—')}
          ${infoRow(isFr ? 'Capacité réservoir' : 'Tank capacity', config.capaciteReservoir ? `${config.capaciteReservoir}L` : '—')}
        </tbody>
      </table>
      ${config.reservoirsAuxiliaires ? `
        ${subHeading(isFr ? 'Réservoirs auxiliaires' : 'Auxiliary tanks')}
        <table><tbody>
          ${infoRow(isFr ? 'Emplacement' : 'Location', val(config.reservoirsAuxiliairesLieu))}
          ${infoRow(isFr ? 'Capacité' : 'Capacity', config.reservoirsAuxiliairesCapacite ? `${config.reservoirsAuxiliairesCapacite}L` : '—')}
          ${infoRow(isFr ? 'Autonomie totale' : 'Total runtime', config.autonomieTotale ? `${config.autonomieTotale}h` : '—')}
        </tbody></table>
      ` : ''}
      ${config.generatriceEquipements?.length > 0 ? `
        ${subHeading(isFr ? 'Équipements sur alimentation de secours' : 'Equipment on backup power')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
          ${config.generatriceEquipements.map((e: string) => checklistItem(escapeHtml(e), true)).join('')}
        </div>
      ` : ''}
      ${config.generatriceEquipementsPersonnalises?.length > 0 ? `
        ${subHeading(isFr ? 'Autres équipements alimentés' : 'Other powered equipment')}
        <table><tbody>
          ${config.generatriceEquipementsPersonnalises.map((e: any) => infoRow('', escapeHtml(e.nom || ''))).join('')}
        </tbody></table>
      ` : ''}

      ${subHeading(isFr ? 'Vannes d\'arrêt' : 'Shutoff valves')}
      <table><tbody>
        ${config.vannesArretSalleGicleurs ? infoRow(isFr ? 'Salle de gicleurs' : 'Sprinkler room', val(config.vannesArretSalleGicleurs)) : ''}
        ${config.vannesArretGazNaturel ? infoRow(isFr ? 'Entrée de gaz naturel' : 'Natural gas inlet', val(config.vannesArretGazNaturel)) : ''}
        ${config.vannesArretEauDomestique ? infoRow(isFr ? 'Arrivée eau domestique' : 'Domestic water supply', val(config.vannesArretEauDomestique)) : ''}
        ${config.vannesArretSalleElectrique ? infoRow(isFr ? 'Salle électrique' : 'Electrical room', val(config.vannesArretSalleElectrique)) : ''}
      </tbody></table>
    </div>
  `;

  const relaisItems = [
    { key: 'teleSurveillance', fr: 'Appel à la centrale d\'alarme', en: 'Call to monitoring station' },
    { key: 'arretVentilation', fr: 'Arrêt de la ventilation', en: 'Ventilation shutdown' },
    { key: 'rappelAscenseurs', fr: 'Rappel des ascenseurs', en: 'Elevator recall' },
    { key: 'desenfumageAutomatique', fr: 'Système de désenfumage', en: 'Smoke control system' },
    { key: 'deverrouillagePorces', fr: 'Déverrouillage des zones à accès contrôlé', en: 'Access-controlled door unlocking' },
    { key: 'fermeturePortesCoupeFeu', fr: 'Fermeture des portes coupe-feu', en: 'Fire door closing' },
  ];

  const detectionItems = [
    { key: 'stationManuelle', fr: 'Station manuelle d\'alarme incendie', en: 'Manual fire alarm station' },
    { key: 'detecteurChaleur', fr: 'Détecteur de chaleur', en: 'Heat detector' },
    { key: 'detecteurFumee', fr: 'Détecteur de fumée', en: 'Smoke detector' },
    { key: 'detecteurDebitGicleurs', fr: 'Détecteur de débit de gicleurs', en: 'Sprinkler flow detector' },
  ];

  const html73 = `
    <div class="page-break">
      ${sectionHeader('7.3', isFr ? 'RÉSEAU D\'ALARME INCENDIE' : 'FIRE ALARM SYSTEM')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Localisation du panneau' : 'Panel location', val(config.panneauLocalisation))}
          ${infoRow(isFr ? 'Marque / Modèle' : 'Brand / Model', `${val(config.panneauMarque, '')} ${val(config.panneauModele, '')}`.trim() || '—')}
          ${infoRow(isFr ? 'Type' : 'Type', val(config.panneauType))}
          ${infoRow(isFr ? 'Technologie' : 'Technology', val(config.panneauTechno))}
          ${infoRow(isFr ? 'Panneau annonciateur' : 'Annunciator panel', bool(config.panneauAnnonciateurDistance, isFr))}
          ${infoRow(isFr ? 'Emplacement annonciateur' : 'Annunciator location', val(config.panneauAnnonciateurLieu))}
          ${infoRow(isFr ? 'Téléphone pompier' : 'Firefighter phone', bool(config.telephonePompier, isFr))}
          ${infoRow(isFr ? 'Communication phonique' : 'Voice communication', bool(config.systemePhonic, isFr))}
        </tbody>
      </table>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:16px;">
        <div>
          ${subHeading(isFr ? 'Relais auxiliaires' : 'Auxiliary relays')}
          ${relaisItems.map(item => checklistItem(isFr ? item.fr : item.en, !!config[item.key])).join('')}
        </div>
        <div>
          ${subHeading(isFr ? 'Éléments de détection' : 'Detection elements')}
          ${detectionItems.map(item => checklistItem(isFr ? item.fr : item.en, !!config[item.key])).join('')}
        </div>
      </div>
    </div>
  `;

  const gicleursSystemesRows = (config.gicleursSystemes || []).map((s: any) => `
    <tr>
      <td style="font-weight:600;">${escapeHtml(s.type) || '—'}</td>
      <td>${escapeHtml(s.lieu) || '—'}</td>
      <td style="text-align:center;">${s.complet ? '✓' : '—'}</td>
    </tr>
  `).join('');

  const html74 = `
    <div class="page-break">
      ${sectionHeader('7.4', isFr ? 'SYSTÈME DE GICLEURS ET PROTECTION INCENDIE' : 'SPRINKLER AND FIRE PROTECTION SYSTEM')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Réseau de gicleurs' : 'Sprinkler network', bool(config.gicleurs, isFr))}
          ${infoRow(isFr ? 'Localisation salle des gicleurs' : 'Sprinkler room location', val(config.salleGicleurs))}
          ${infoRow(isFr ? 'Vannes d\'isolement de zone' : 'Zone isolation valves', bool(config.vannesIsolement, isFr))}
          ${infoRow(isFr ? 'Emplacement vannes' : 'Valve location', val(config.vannesIsolementLieu))}
        </tbody>
      </table>

      ${config.gicleursSystemes?.length > 0 ? `
        ${subHeading(isFr ? 'Systèmes de gicleurs' : 'Sprinkler systems')}
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Type de réseau' : 'Network type'}</th>
              <th>${isFr ? 'Secteurs / lieux desservis' : 'Covered areas / sectors'}</th>
            </tr>
          </thead>
          <tbody>
            ${config.gicleursSystemes.map((s: any) => `
              <tr>
                <td style="font-weight:600;">${escapeHtml(s.type) || '—'}</td>
                <td>${escapeHtml(s.lieu) || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      ${config.pompeIncendie ? `
        ${subHeading(isFr ? 'Pompe incendie' : 'Fire pump')}
        <table><tbody>
          ${infoRow(isFr ? 'Présente' : 'Present', bool(config.pompeIncendie, isFr))}
          ${config.pompeIncendieLieu ? infoRow(isFr ? 'Localisation' : 'Location', val(config.pompeIncendieLieu)) : ''}
          ${config.gapmUsgpm ? infoRow(isFr ? 'Débit (GAPM/USGPM)' : 'Flow rate (GAPM/USGPM)', val(config.gapmUsgpm)) : ''}
        </tbody></table>
      ` : ''}

      ${config.valve2_5 || config.valve1_5 ? `
        ${subHeading(isFr ? 'Valves de raccordement' : 'Connection valves')}
        <table><tbody>
          ${config.valve2_5 ? infoRow(isFr ? 'Valve 2½ — Localisation' : 'Valve 2½ — Location', val(config.valve2_5Lieu)) : ''}
          ${config.valve1_5 ? infoRow(isFr ? 'Valve 1½ — Localisation' : 'Valve 1½ — Location', val(config.valve1_5Lieu)) : ''}
        </tbody></table>
      ` : ''}
    </div>
  `;

  const matieresRows = (config.matieresList || []).map((m: any) => `
    <tr>
      <td>${escapeHtml(m.nom) || '—'}</td>
      <td>${escapeHtml(m.numeroUN) || '—'}</td>
      <td>${escapeHtml(m.quantiteEmplacement) || '—'}</td>
      <td style="text-align:center;">${m.tmd ? '✓' : '—'}</td>
      <td style="text-align:center;">${m.simdut ? '✓' : '—'}</td>
    </tr>
  `).join('');

  const html75 = `
    <div class="page-break">
      ${sectionHeader('7.5', isFr ? 'MATIÈRES DANGEREUSES' : 'HAZARDOUS MATERIALS')}
      ${config.matieresList?.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Nom du produit' : 'Product name'}</th>
              <th>${isFr ? 'Numéro UN' : 'UN number'}</th>
              <th>${isFr ? 'Quantité et emplacement' : 'Quantity and location'}</th>
              <th>TMD</th>
              <th>SIMDUT</th>
            </tr>
          </thead>
          <tbody>${matieresRows}</tbody>
        </table>
      ` : `<p style="color:#ADB5BD;">${isFr ? 'Aucune matière dangereuse déclarée' : 'No hazardous materials declared'}</p>`}

      ${subHeading(isFr ? 'Trousse de déversement' : 'Spill kit')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Présente' : 'Present', bool(config.trousseDeversement, isFr))}
          ${config.trousseDeversementListe?.length > 0 ? `
            ${config.trousseDeversementListe.map((t: any, idx: number) => 
              infoRow(isFr ? `Emplacement ${idx + 1}` : `Location ${idx + 1}`, val(t.lieu))
            ).join('')}
          ` : config.trousseDeversementLieu ? infoRow(isFr ? 'Emplacement' : 'Location', val(config.trousseDeversementLieu)) : ''}
        </tbody>
      </table>
    </div>
  `;

  const extincteursRows = (config.extincteursList || []).map((ex: any) => `
    <tr>
      <td style="font-weight:600;">${escapeHtml(ex.type) || '—'}</td>
      <td>${escapeHtml(ex.lieu) || '—'}</td>
    </tr>
  `).join('');

  const procedureSteps = isFr ? [
    { label: 'Alerte', text: 'Prévenez immédiatement les occupants à proximité.' },
    { label: 'Avertisseur', text: 'Activez la station manuelle d\'alarme incendie la plus proche.' },
    { label: 'Sécurité personnelle', text: 'Assurez-vous que votre sécurité n\'est pas en danger.' },
    { label: 'Préparation', text: 'Retirez l\'extincteur de son support.' },
    { label: 'Positionnement', text: 'Placez-vous entre le feu et une sortie pour assurer une voie de fuite.' },
    { label: 'Approche', text: 'Avancez à une distance de 2-3 mètres (6-10 pieds) du feu.' },
    { label: 'Activation', text: 'Retirez la goupille en la tournant et en la tirant pour briser le scellé.' },
    { label: 'Ciblage', text: 'Tenez le boyau (si présent) et dirigez-le vers la base des flammes.' },
    { label: 'Extinction', text: 'Appuyez sur le levier et faites des mouvements de balayage de va-et-vient à la base des flammes, couvrant toute la largeur du feu.' },
    { label: 'Départ', text: 'Déposez l\'extincteur au bas du mur et évacuez par la sortie la plus proche.' },
    { label: 'Point de rassemblement', text: 'Rejoignez le point de rassemblement extérieur pour un comptage sécuritaire.' },
  ] : [
    { label: 'Alert', text: 'Immediately warn occupants nearby.' },
    { label: 'Alarm', text: 'Activate the nearest manual fire alarm station.' },
    { label: 'Personal safety', text: 'Make sure your own safety is not at risk.' },
    { label: 'Preparation', text: 'Remove the extinguisher from its mount.' },
    { label: 'Positioning', text: 'Stand between the fire and an exit to ensure an escape route.' },
    { label: 'Approach', text: 'Move to a distance of 2-3 meters (6-10 feet) from the fire.' },
    { label: 'Activation', text: 'Pull the pin by twisting and pulling to break the seal.' },
    { label: 'Aiming', text: 'Hold the hose (if present) and aim it at the base of the flames.' },
    { label: 'Extinguishing', text: 'Squeeze the lever and sweep side to side at the base of the flames, covering the full width of the fire.' },
    { label: 'Departure', text: 'Set the extinguisher down at the base of the wall and evacuate via the nearest exit.' },
    { label: 'Assembly point', text: 'Join the outdoor assembly point for a safety headcount.' },
  ];

  const procedureStepsHtml = procedureSteps.map((s, idx) => `
    <li><strong>${s.label}</strong> : ${s.text}</li>
  `).join('');

  const pictosHtml = `
    <img src="${PASS_EXTINGUISHER_IMAGE}" style="width:100%;max-width:480px;display:block;margin:0 auto;" />
  `;

  const html76 = `
    <div class="page-break">
      ${sectionHeader('7.6', isFr ? 'EXTINCTEUR PORTATIF' : 'PORTABLE FIRE EXTINGUISHER')}

      ${subHeading(isFr ? 'Utilisation' : 'Usage')}
      <ol style="margin:8px 0;padding-left:22px;">
        ${procedureStepsHtml}
      </ol>
      <div style="display:flex;justify-content:center;gap:24px;margin:16px 0 24px 0;">
        ${pictosHtml}
      </div>

      ${subHeading(isFr ? 'Localisation' : 'Location')}
      ${config.extincteursList?.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Type d\'extincteur' : 'Extinguisher type'}</th>
              <th>${isFr ? 'Localisation' : 'Location'}</th>
            </tr>
          </thead>
          <tbody>${extincteursRows}</tbody>
        </table>
      ` : `<p style="color:#ADB5BD;">${isFr ? 'Aucun extincteur déclaré' : 'No extinguisher declared'}</p>`}
    </div>
  `;

  const soinsRows = (config.equipementsSoins || []).map((eq: any) => `
    <tr>
      <td style="font-weight:600;">${escapeHtml(eq.type) || '—'}</td>
      <td style="text-align:center;color:#27AE60;">✓</td>
      <td>${escapeHtml(eq.lieu) || '—'}</td>
    </tr>
  `).join('');

  const html77 = `
    <div class="page-break">
      ${sectionHeader('7.7', isFr ? 'ÉQUIPEMENTS DE PREMIERS SOINS' : 'FIRST AID EQUIPMENT')}
      ${config.equipementsSoins?.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>${isFr ? 'Équipement' : 'Equipment'}</th>
              <th>${isFr ? 'Disponible' : 'Available'}</th>
              <th>${isFr ? 'Emplacement' : 'Location'}</th>
            </tr>
          </thead>
          <tbody>${soinsRows}</tbody>
        </table>
      ` : `<p style="color:#ADB5BD;">${isFr ? 'Aucun équipement déclaré' : 'No equipment declared'}</p>`}
    </div>
  `;

  const detectors = [
    {
      label: isFr ? '7.8.1 Détecteur de monoxyde de carbone (CO)' : '7.8.1 Carbon Monoxide Detector (CO)',
      present: config.detecteurCO,
      seuil1: config.detecteurCOSeuil1 ? `${config.detecteurCOSeuil1} ppm` : '25 ppm',
      seuil2: config.detecteurCOSeuil2 ? `${config.detecteurCOSeuil2} ppm` : '150 ppm',
      lieu: config.detecteurCOLieu,
    },
    {
      label: isFr ? '7.8.2 Détecteur de gaz naturel — Méthane (CH₄)' : '7.8.2 Natural Gas Detector — Methane (CH₄)',
      present: config.detecteurGazNaturel,
      seuil1: '5 000 ppm',
      seuil2: '72 000 ppm',
      lieu: config.detecteurGazNaturelLieu,
    },
    ...(isIndustriel ? [
      {
        label: isFr ? '7.8.3 Détecteur de propane (C3H8)' : '7.8.3 Propane Detector (C3H8)',
        present: config.detecteurPropane,
        seuil1: '23 000 ppm', seuil2: 'xxx ppm', lieu: undefined,
      },
      {
        label: isFr ? '7.8.4 Détecteur d\'ammoniac (NH₃)' : '7.8.4 Ammonia Detector (NH₃)',
        present: config.detecteurAmmoniac,
        seuil1: config.detecteurAmmoniacSeuil1 ? `${config.detecteurAmmoniacSeuil1} ppm` : '25 ppm',
        seuil2: config.detecteurAmmoniacSeuil2 ? `${config.detecteurAmmoniacSeuil2} ppm` : '35 ppm',
        lieu: undefined,
      },
      {
        label: isFr ? '7.8.5 Détecteur de fréon (NCHC)' : '7.8.5 Freon Detector (NCHC)',
        present: config.detecteurFreon,
        seuil1: '250 ppm', seuil2: '500 ppm', lieu: undefined,
      },
      {
        label: isFr ? '7.8.6 Détecteur d\'oxygène (O₂)' : '7.8.6 Oxygen Detector (O₂)',
        present: config.detecteurO2,
        seuil1: '19.5%', seuil2: '20%', lieu: undefined,
      },
      {
        label: isFr ? '7.8.7 Détecteur FM200 — Heptafluoropropane (C₃HF₇)' : '7.8.7 FM200 Detector — Heptafluoropropane (C₃HF₇)',
        present: config.detecteurFM200,
        seuil1: '—', seuil2: '—', lieu: undefined,
      },
    ] : []),
  ].filter(d => d.present);

  const detectorsHtml = detectors.map(d => `
    <div style="margin-bottom:16px;">
      <p style="font-size:9pt;font-weight:700;color:#495057;margin-bottom:6px;">${d.label}</p>
      <table>
        <tbody>
          ${infoRow(isFr ? 'Seuil d\'activation minimal' : 'Minimum activation threshold', d.seuil1)}
          ${infoRow(isFr ? 'Seuil d\'activation maximal' : 'Maximum activation threshold', d.seuil2)}
          ${infoRow(isFr ? 'Emplacement' : 'Location', val(d.lieu))}
        </tbody>
      </table>
    </div>
  `).join('');

  const html78 = `
    <div style="margin-top:28px;">
      ${sectionHeader('7.8', isFr ? 'DÉTECTEURS DE GAZ' : 'GAS DETECTORS')}
      ${detectors.length > 0 ? detectorsHtml : `<p style="color:#ADB5BD;">${isFr ? 'Aucun détecteur de gaz déclaré' : 'No gas detector declared'}</p>`}
    </div>
  `;

  const photoEntries = Object.entries(photos)
    .filter(([_, p]: [string, any]) => p && p.base64)
    .sort(([a], [b]) => a.localeCompare(b));

  // Grouper les photos par 6 (max par page)
  const photoGroups: Array<Array<[string, any]>> = [];
  for (let i = 0; i < photoEntries.length; i += 6) {
    photoGroups.push(photoEntries.slice(i, i + 6));
  }

  const renderPhotoGroup = (group: Array<[string, any]>): string => {
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
            <img src="data:image/jpeg;base64,${photo1.base64}" style="width:100%;height:175px;object-fit:cover;display:block;" />
          </div>
        </td>`;
      const cell2 = pair ? `
        <td style="width:50%;padding:6px;vertical-align:top;border:none;">
          <div style="border:1px solid #E9ECEF;border-radius:4px;overflow:hidden;">
            <div style="background-color:#C0392B;color:#FFFFFF;padding:6px 12px;font-size:9pt;font-weight:700;">
              ${escapeHtml((pair[1] as any).label || '')}
            </div>
            <img src="data:image/jpeg;base64,${(pair[1] as any).base64}" style="width:100%;height:175px;object-fit:cover;display:block;" />
          </div>
        </td>` : '<td style="width:50%;padding:6px;border:none;"></td>';
      rows.push(`<tr style="page-break-inside:avoid;">${cell1}${cell2}</tr>`);
    }
    return `<table style="width:100%;border-collapse:collapse;border:none;page-break-inside:avoid;">${rows.join('')}</table>`;
  };

  const html79 = `
    <div class="page-break">
      ${sectionHeader('7.9', isFr ? 'PHOTOS DES ÉQUIPEMENTS DE PROTECTION' : 'PROTECTION EQUIPMENT PHOTOS')}
      ${photoEntries.length > 0
        ? photoGroups.map((group, idx) => `
            <div style="${idx > 0 ? 'page-break-before:always;' : ''}">
              ${renderPhotoGroup(group)}
            </div>
          `).join('')
        : `<p style="color:#ADB5BD;">${isFr ? 'Aucune photo ajoutée' : 'No photos added'}</p>`
      }
    </div>
  `;

  return [
    { id: 'site_general', title: isFr ? 'Description générale' : 'General Description', html: html71 },
    { id: 'site_mecanique', title: isFr ? 'Mécanique du bâtiment' : 'Building Mechanical Systems', html: html72 },
    { id: 'site_alarme', title: isFr ? 'Réseau d\'alarme incendie' : 'Fire Alarm System', html: html73 },
    { id: 'site_gicleurs', title: isFr ? 'Système de gicleurs et protection incendie' : 'Sprinkler and Fire Protection System', html: html74 },
    { id: 'site_matieres', title: isFr ? 'Matières dangereuses' : 'Hazardous Materials', html: html75 },
    { id: 'site_extincteur', title: isFr ? 'Extincteur portatif' : 'Portable Fire Extinguisher', html: html76 },
    { id: 'site_soins', title: isFr ? 'Équipements de premiers soins' : 'First Aid Equipment', html: html77 },
    { id: 'site_detecteurs', title: isFr ? 'Détecteurs de gaz' : 'Gas Detectors', html: html78 },
    { id: 'site_photos', title: isFr ? 'Photos des équipements de protection' : 'Protection Equipment Photos', html: html79 },
  ];
}