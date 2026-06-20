// ============================================================
// CORO — Module 7 : Description du site et équipements
// Sections 7.1 à 7.9 complètes
// ============================================================

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

export function renderModule7(module7Data: any, config: any, lang: 'fr' | 'en'): string {
  const isFr = lang === 'fr';
  config = config || {};
  const extra = module7Data?.extraData || {};
  const quarts = module7Data?.quartsData || {};
  const photos = module7Data?.photosData || {};

  const isIndustriel = config.buildingType === 'Industriel' || config.usagePrincipal?.startsWith('F');

  const sectionHeader = (id: string, line2: string) => `
    <div class="section-header">
      <span class="section-id">${id}</span>
      <span class="section-title-line2">${line2}</span>
      <div class="section-bar"></div>
    </div>
  `;

  const quartsRows = (['jour', 'soir', 'nuit'] as const).map(period => {
    const labels = isFr
      ? { jour: 'Jour (6h00 – 18h00)', soir: 'Soir (18h00 – 24h00)', nuit: 'Nuit (00h00 – 06h00)' }
      : { jour: 'Day (6:00 AM – 6:00 PM)', soir: 'Evening (6:00 PM – 12:00 AM)', nuit: 'Night (12:00 AM – 6:00 AM)' };
    const q = quarts[period] || { semaine: '', samedi: '', dimanche: '' };
    return `
      <tr>
        <td style="font-weight:600;">${labels[period]}</td>
        <td style="text-align:center;">${val(q.semaine)}</td>
        <td style="text-align:center;">${val(q.samedi)}</td>
        <td style="text-align:center;">${val(q.dimanche)}</td>
      </tr>
    `;
  }).join('');

  const occupantsRows = (['Jour', 'Soir', 'Nuit'] as const).map(period => {
    const key = `nbOccupants${period}`;
    const occupied = config[`occupation${period}`];
    if (!occupied) return '';
    const labelFr: Record<string, string> = { Jour: 'Jour', Soir: 'Soir', Nuit: 'Nuit' };
    const labelEn: Record<string, string> = { Jour: 'Day', Soir: 'Evening', Nuit: 'Night' };
    return infoRow(
      isFr ? `Nombre approximatif d'occupants — ${labelFr[period]}` : `Approximate occupant count — ${labelEn[period]}`,
      val(config[key])
    );
  }).join('');

  const html71 = `
    <div>
      ${sectionHeader('7.1', isFr ? 'DESCRIPTION GÉNÉRALE' : 'GENERAL DESCRIPTION')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Usage principal' : 'Primary use', val(config.usagePrincipal))}
          ${infoRow(isFr ? 'Usage secondaire' : 'Secondary use', val(config.usageSecondaire))}
          ${infoRow(isFr ? 'Nombre de sous-sols' : 'Number of basements', val(config.basements, '0'))}
          ${infoRow(isFr ? 'Nombre d\'étages' : 'Number of floors', val(config.floors, '0'))}
          ${infoRow(isFr ? 'Grande hauteur (+18m)' : 'High-rise (+18m)', bool(config.hauteurBatiment, isFr))}
          ${infoRow(isFr ? 'Construction du bâtiment' : 'Building construction', val(config.typeConstruction))}
          ${infoRow(isFr ? 'Année de construction' : 'Year built', val(config.anneeConstruction))}
          ${infoRow(isFr ? 'Dernière rénovation majeure' : 'Last major renovation', val(config.derniereRenovation))}
          ${infoRow(isFr ? 'Superficie (pi²)' : 'Area (sq ft)', val(config.superficie))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Emplacements' : 'Locations')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Poste de commandement' : 'Command post', val(config.posteCommandement))}
          ${infoRow(isFr ? 'Point de rassemblement' : 'Assembly point', val(config.pointRassemblement))}
          ${infoRow(isFr ? 'Trousseau de clés pompier' : 'Fire department key box', bool(config.trousseClesPompier, isFr))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Occupation des lieux' : 'Building occupancy')}
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
      ${occupantsRows ? `<table style="margin-top:8px;"><tbody>${occupantsRows}</tbody></table>` : ''}
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
      ${config.generatriceEquipements?.length > 0 ? `
        <p style="font-size:10pt;color:#495057;margin-top:8px;">
          <strong>${isFr ? 'Équipements sur alimentation de secours' : 'Equipment on backup power'} :</strong>
          ${config.generatriceEquipements.map((e: string) => escapeHtml(e)).join(', ')}
        </p>
      ` : ''}
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
          ${infoRow(isFr ? 'Panneau annonciateur' : 'Annunciator panel', bool(config.panneauAnnonciateurDistance, isFr))}
          ${infoRow(isFr ? 'Emplacement annonciateur' : 'Annunciator location', val(config.panneauAnnonciateurLieu))}
          ${infoRow(isFr ? 'Téléphone pompier' : 'Firefighter phone', bool(config.telephonePompier, isFr))}
          ${infoRow(isFr ? 'Communication phonique' : 'Voice communication', bool(config.systemePhonic, isFr))}
        </tbody>
      </table>

      ${subHeading(isFr ? 'Relais auxiliaires' : 'Auxiliary relays')}
      ${relaisItems.map(item => checklistItem(isFr ? item.fr : item.en, !!config[item.key])).join('')}

      ${subHeading(isFr ? 'Éléments de détection' : 'Detection elements')}
      ${detectionItems.map(item => checklistItem(isFr ? item.fr : item.en, !!config[item.key])).join('')}
    </div>
  `;

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

      ${subHeading(isFr ? 'Équipements' : 'Equipment')}
      <table>
        <tbody>
          ${infoRow(isFr ? 'Prise de refoulement' : 'Fire department connection', bool(config.priseRefoulement, isFr))}
          ${infoRow(isFr ? 'Pompe incendie' : 'Fire pump', bool(config.pompeIncendie, isFr))}
          ${infoRow('GAPM/USGPM', val(config.gapmUsgpm))}
          ${infoRow(isFr ? 'Système spécial d\'extinction' : 'Special suppression system', bool(config.systemeExtinctionFixe, isFr))}
          ${infoRow(isFr ? 'Boyau incendie / Cabinet' : 'Fire hose / Cabinet', bool(config.boyauIncendie, isFr))}
          ${infoRow(isFr ? 'Raccord pompier' : 'Fire department connection point', bool(config.raccordPompier, isFr))}
          ${infoRow(isFr ? 'Emplacement raccord' : 'Connection location', val(config.raccordPompierLieu))}
          ${infoRow(isFr ? 'Borne-fontaine' : 'Fire hydrant', bool(config.bornesFontaine, isFr))}
          ${infoRow(isFr ? 'Emplacement borne-fontaine' : 'Hydrant location', val(config.bornesFontaineLieu))}
        </tbody>
      </table>
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
          ${infoRow(isFr ? 'Emplacement' : 'Location', val(config.trousseDeversementLieu))}
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

  const html76 = `
    <div class="page-break">
      ${sectionHeader('7.6', isFr ? 'EXTINCTEUR PORTATIF' : 'PORTABLE FIRE EXTINGUISHER')}
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
    <div class="page-break">
      ${sectionHeader('7.8', isFr ? 'DÉTECTEURS DE GAZ' : 'GAS DETECTORS')}
      ${detectors.length > 0 ? detectorsHtml : `<p style="color:#ADB5BD;">${isFr ? 'Aucun détecteur de gaz déclaré' : 'No gas detector declared'}</p>`}
    </div>
  `;

  const photoEntries = Object.entries(photos)
    .filter(([_, p]: [string, any]) => p && p.base64)
    .sort(([a], [b]) => a.localeCompare(b));

  const photoCells = photoEntries.map(([key, photo]: [string, any]) => `
    <div style="border:1px solid #E9ECEF;border-radius:4px;overflow:hidden;margin-bottom:14px;">
      <div style="background-color:#C0392B;color:#FFFFFF;padding:6px 12px;font-size:9pt;font-weight:700;">
        ${escapeHtml(photo.label || '')}
      </div>
      <img src="data:image/jpeg;base64,${photo.base64}" style="width:100%;height:180px;object-fit:cover;display:block;" />
    </div>
  `).join('');

  const html79 = `
    <div class="page-break">
      ${sectionHeader('7.9', isFr ? 'PHOTOS DES ÉQUIPEMENTS DE PROTECTION' : 'PROTECTION EQUIPMENT PHOTOS')}
      ${photoEntries.length > 0 ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          ${photoCells}
        </div>
      ` : `<p style="color:#ADB5BD;">${isFr ? 'Aucune photo ajoutée' : 'No photos added'}</p>`}
    </div>
  `;

  return html71 + html72 + html73 + html74 + html75 + html76 + html77 + html78 + html79;
}