'use client';

import { useState, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

export interface LithiumAnnexeData {
  // 8.10.1 — Sources d'eau et d'alimentations
  bornesFontaines: boolean;
  distanceBornesFontaines: string;
  raccordsPompiers: boolean;
  localisationRaccords: string;
  alimentationSprinklers: boolean;
  alimentationColonneSeche: boolean;
  alimentationAutre: boolean;
  alimentationAutreTexte: string;
  reserveEauSite: boolean;
  capaciteReserve: string;
  autresSourcesEau: string;

  // 8.10.2 — Informations d'intervention
  accesSouterrain: boolean;
  contraintesAcces: string;

  // 8.10.3 — Estimation véhicules électriques
  nombreVehiculesEstime: string;
  methodeDonneesOccupation: boolean;
  methodeTauxOccupation: boolean;
  methodeAutre: boolean;
  methodeAutreTexte: string;

  // 8.10.4 — Présence de bornes de recharge
  nombreBornes: string;
  typeBorneNiveau2: boolean;
  typeBorneRapideDC: boolean;
  typeBorneAutre: boolean;
  typeBorneAutreTexte: string;
  tensionNominale: string;
  courantMaximal: string;
  localisationStationnementInterieur: boolean;
  localisationStationnementExterieur: boolean;
  localisationZoneSpecifique: boolean;
  localisationZoneSpecifiqueTexte: string;

  // 8.10.5 — Types de véhicules potentiellement présents
  vehiculeElectrique: boolean;
  vehiculeHybrideRechargeable: boolean;
  vehiculeUtilitaireElectrique: boolean;
  vehiculeVisiteurInconnu: boolean;

  // 8.10.6 — Contraintes du stationnement
  hauteurLibreMax: string;
  largeurVoies: string;
  contrainteHauteurLimitee: boolean;
  contrainteAccesRestreint: boolean;
  contrainteRayonsVirage: boolean;
  contrainteAutres: boolean;
  contrainteAutresTexte: string;

  // 8.10.7 — Zones à risque identifiées
  zoneAiresRecharge: boolean;
  zoneStationnementInterieur: boolean;
  zoneProximiteStructures: boolean;
  zoneAutres: boolean;
  zoneAutresTexte: string;

  // 8.10.8 — Coupures et contrôles énergétiques
  dispositifCoupureManuelle: 'oui' | 'non' | '';
  localisationCoupureManuelle: string;
  localisationCoupureElectrique: string;
}

interface Module8Section10Props {
  data: LithiumAnnexeData;
  onChange: (data: LithiumAnnexeData) => void;
  markDirty: () => void;
  language?: 'fr' | 'en';
}

export const DEFAULT_LITHIUM_ANNEXE_DATA: LithiumAnnexeData = {
  bornesFontaines: false, distanceBornesFontaines: '',
  raccordsPompiers: false, localisationRaccords: '',
  alimentationSprinklers: false, alimentationColonneSeche: false,
  alimentationAutre: false, alimentationAutreTexte: '',
  reserveEauSite: false, capaciteReserve: '',
  autresSourcesEau: '',
  accesSouterrain: false, contraintesAcces: '',
  nombreVehiculesEstime: '',
  methodeDonneesOccupation: false, methodeTauxOccupation: false,
  methodeAutre: false, methodeAutreTexte: '',
  nombreBornes: '',
  typeBorneNiveau2: false, typeBorneRapideDC: false,
  typeBorneAutre: false, typeBorneAutreTexte: '',
  tensionNominale: '', courantMaximal: '',
  localisationStationnementInterieur: false,
  localisationStationnementExterieur: false,
  localisationZoneSpecifique: false, localisationZoneSpecifiqueTexte: '',
  vehiculeElectrique: false, vehiculeHybrideRechargeable: false,
  vehiculeUtilitaireElectrique: false, vehiculeVisiteurInconnu: false,
  hauteurLibreMax: '', largeurVoies: '',
  contrainteHauteurLimitee: false, contrainteAccesRestreint: false,
  contrainteRayonsVirage: false, contrainteAutres: false, contrainteAutresTexte: '',
  zoneAiresRecharge: false, zoneStationnementInterieur: false,
  zoneProximiteStructures: false, zoneAutres: false, zoneAutresTexte: '',
  dispositifCoupureManuelle: '', localisationCoupureManuelle: '',
  localisationCoupureElectrique: '',
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function SubHeading({ number, title }: { number: string; title: string }) {
  return (
    <p className="text-sm font-bold uppercase tracking-wide mt-8 mb-3" style={{ color: '#C0392B' }}>
      {number} — {title}
    </p>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 py-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#C0392B', width: '16px', height: '16px' }}
      />
      <span className="text-sm" style={{ color: '#495057' }}>{label}</span>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder = '', suffix = '' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string;
}) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: '#6C757D' }}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm rounded"
          style={{ border: '1px solid #DEE2E6', color: '#2C3E50', backgroundColor: '#FFFFFF', outline: 'none' }}
        />
        {suffix && <span className="text-sm" style={{ color: '#ADB5BD' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function WarningBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 px-4 py-3 mt-4 rounded"
      style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
      <span style={{ color: '#F39C12' }}>⚠</span>
      <p className="text-xs" style={{ color: '#7D6608' }}>{text}</p>
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module8Section10({
  data,
  onChange,
  markDirty,
  language = 'fr',
}: Module8Section10Props) {
  const isFr = language === 'fr';

  const update = <K extends keyof LithiumAnnexeData>(field: K, value: LithiumAnnexeData[K]) => {
    onChange({ ...data, [field]: value });
    markDirty();
  };

  const t = isFr ? {
    title: 'ANNEXE — INCENDIE DE BATTERIES LITHIUM-ION',
    s1: 'Sources d\'eau et d\'alimentations disponibles',
    s2: 'Informations d\'intervention',
    s3: 'Estimation de la présence de véhicules électriques',
    s4: 'Présence de bornes de recharge',
    s5: 'Types de véhicules potentiellement présents',
    s6: 'Contraintes du stationnement',
    s7: 'Zones à risque identifiées',
    s8: 'Coupures et contrôles énergétiques',
    s9: 'Détection incendie vs intervention spécifique lithium-ion',
    s10: 'Mesures de sécurité opérationnelles',
  } : {
    title: 'APPENDIX — LITHIUM-ION BATTERY FIRE',
    s1: 'Available water sources and supplies',
    s2: 'Intervention information',
    s3: 'Estimated presence of electric vehicles',
    s4: 'Presence of charging stations',
    s5: 'Types of vehicles potentially present',
    s6: 'Parking constraints',
    s7: 'Identified risk zones',
    s8: 'Energy shutoffs and controls',
    s9: 'Fire detection vs lithium-ion specific intervention',
    s10: 'Operational safety measures',
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-start gap-2 mb-1">
          <div className="w-8 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: '#F8F9FA', color: '#6C757D', border: '1px solid #DEE2E6' }}>
            8.10
          </div>
          <h2 className="text-xl font-black uppercase leading-tight" style={{ color: '#2C3E50' }}>
            {t.title}
          </h2>
        </div>
        <div className="h-0.5 mt-1 mb-4" style={{ backgroundColor: '#C0392B' }} />
      </div>

      <div className="rounded-md p-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF' }}>

        {/* 8.10.1 — Sources d'eau */}
        <SubHeading number="8.10.1" title={t.s1} />
        <CheckRow checked={data.bornesFontaines} onChange={v => update('bornesFontaines', v)} label={isFr ? 'Bornes-fontaines publiques' : 'Public fire hydrants'} />
        {data.bornesFontaines && (
          <TextField label={isFr ? 'Distance approximative du site' : 'Approximate distance from site'} value={data.distanceBornesFontaines} onChange={v => update('distanceBornesFontaines', v)} suffix="m" />
        )}
        <CheckRow checked={data.raccordsPompiers} onChange={v => update('raccordsPompiers', v)} label={isFr ? 'Raccords pompiers (si applicables)' : 'Fire department connections (if applicable)'} />
        {data.raccordsPompiers && (
          <TextField label={isFr ? 'Localisation' : 'Location'} value={data.localisationRaccords} onChange={v => update('localisationRaccords', v)} />
        )}
        <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#6C757D' }}>
          {isFr ? 'Alimentation du système' : 'System supply'}
        </p>
        <CheckRow checked={data.alimentationSprinklers} onChange={v => update('alimentationSprinklers', v)} label="Sprinklers" />
        <CheckRow checked={data.alimentationColonneSeche} onChange={v => update('alimentationColonneSeche', v)} label={isFr ? 'Colonne sèche' : 'Dry standpipe'} />
        <CheckRow checked={data.alimentationAutre} onChange={v => update('alimentationAutre', v)} label={isFr ? 'Autre' : 'Other'} />
        {data.alimentationAutre && (
          <TextField label={isFr ? 'Préciser' : 'Specify'} value={data.alimentationAutreTexte} onChange={v => update('alimentationAutreTexte', v)} />
        )}
        <CheckRow checked={data.reserveEauSite} onChange={v => update('reserveEauSite', v)} label={isFr ? 'Réserve d\'eau sur site' : 'On-site water reserve'} />
        {data.reserveEauSite && (
          <TextField label={isFr ? 'Capacité approximative' : 'Approximate capacity'} value={data.capaciteReserve} onChange={v => update('capaciteReserve', v)} suffix="L" />
        )}
        <TextField label={isFr ? 'Autres sources (ex: mousse F500)' : 'Other sources (e.g. F500 foam)'} value={data.autresSourcesEau} onChange={v => update('autresSourcesEau', v)} />

        {/* 8.10.2 — Informations d'intervention */}
        <SubHeading number="8.10.2" title={t.s2} />
        <CheckRow checked={data.accesSouterrain} onChange={v => update('accesSouterrain', v)} label={isFr ? 'Accès souterrain' : 'Underground access'} />
        <TextField label={isFr ? 'Contraintes d\'accès connues' : 'Known access constraints'} value={data.contraintesAcces} onChange={v => update('contraintesAcces', v)} />

        {/* 8.10.3 — Estimation véhicules électriques */}
        <SubHeading number="8.10.3" title={t.s3} />
        <TextField label={isFr ? 'Nombre moyen estimé de véhicules électriques présents simultanément' : 'Estimated average number of electric vehicles present simultaneously'} value={data.nombreVehiculesEstime} onChange={v => update('nombreVehiculesEstime', v)} />
        <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#6C757D' }}>
          {isFr ? 'Méthode d\'estimation' : 'Estimation method'}
        </p>
        <CheckRow checked={data.methodeDonneesOccupation} onChange={v => update('methodeDonneesOccupation', v)} label={isFr ? 'Données d\'occupation du stationnement' : 'Parking occupancy data'} />
        <CheckRow checked={data.methodeTauxOccupation} onChange={v => update('methodeTauxOccupation', v)} label={isFr ? 'Taux d\'occupation moyen par immeuble' : 'Average occupancy rate per building'} />
        <CheckRow checked={data.methodeAutre} onChange={v => update('methodeAutre', v)} label={isFr ? 'Autre' : 'Other'} />
        {data.methodeAutre && (
          <TextField label={isFr ? 'Préciser' : 'Specify'} value={data.methodeAutreTexte} onChange={v => update('methodeAutreTexte', v)} />
        )}
        <WarningBox text={isFr ? 'Cette estimation demeure approximative et peut varier selon l\'heure, le jour et l\'achalandage.' : 'This estimate remains approximate and may vary depending on the time, day, and traffic.'} />

        {/* 8.10.4 — Bornes de recharge */}
        <SubHeading number="8.10.4" title={t.s4} />
        <div className="grid grid-cols-2 gap-4">
          <TextField label={isFr ? 'Nombre de bornes' : 'Number of charging stations'} value={data.nombreBornes} onChange={v => update('nombreBornes', v)} />
          <div />
        </div>
        <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#6C757D' }}>{isFr ? 'Type de bornes' : 'Charging station type'}</p>
        <CheckRow checked={data.typeBorneNiveau2} onChange={v => update('typeBorneNiveau2', v)} label={isFr ? 'Niveau 2 (AC)' : 'Level 2 (AC)'} />
        <CheckRow checked={data.typeBorneRapideDC} onChange={v => update('typeBorneRapideDC', v)} label={isFr ? 'Recharge rapide (DC)' : 'Fast charging (DC)'} />
        <CheckRow checked={data.typeBorneAutre} onChange={v => update('typeBorneAutre', v)} label={isFr ? 'Autre' : 'Other'} />
        {data.typeBorneAutre && (
          <TextField label={isFr ? 'Préciser' : 'Specify'} value={data.typeBorneAutreTexte} onChange={v => update('typeBorneAutreTexte', v)} />
        )}
        <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#6C757D' }}>{isFr ? 'Caractéristiques électriques (si disponibles)' : 'Electrical characteristics (if available)'}</p>
        <div className="grid grid-cols-2 gap-4">
          <TextField label={isFr ? 'Tension nominale' : 'Nominal voltage'} value={data.tensionNominale} onChange={v => update('tensionNominale', v)} suffix="V" />
          <TextField label={isFr ? 'Courant maximal' : 'Maximum current'} value={data.courantMaximal} onChange={v => update('courantMaximal', v)} suffix="A" />
        </div>
        <WarningBox text={isFr ? 'Ces informations sont indicatives et peuvent varier selon les équipements et les véhicules connectés.' : 'This information is indicative and may vary depending on equipment and connected vehicles.'} />
        <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#6C757D' }}>{isFr ? 'Localisation des bornes' : 'Charging station location'}</p>
        <CheckRow checked={data.localisationStationnementInterieur} onChange={v => update('localisationStationnementInterieur', v)} label={isFr ? 'Stationnement intérieur' : 'Indoor parking'} />
        <CheckRow checked={data.localisationStationnementExterieur} onChange={v => update('localisationStationnementExterieur', v)} label={isFr ? 'Stationnement extérieur' : 'Outdoor parking'} />
        <CheckRow checked={data.localisationZoneSpecifique} onChange={v => update('localisationZoneSpecifique', v)} label={isFr ? 'Zone spécifique' : 'Specific zone'} />
        {data.localisationZoneSpecifique && (
          <TextField label={isFr ? 'Préciser' : 'Specify'} value={data.localisationZoneSpecifiqueTexte} onChange={v => update('localisationZoneSpecifiqueTexte', v)} />
        )}

        {/* 8.10.5 — Types de véhicules */}
        <SubHeading number="8.10.5" title={t.s5} />
        <CheckRow checked={data.vehiculeElectrique} onChange={v => update('vehiculeElectrique', v)} label={isFr ? 'Véhicules électriques (VE)' : 'Electric vehicles (EV)'} />
        <CheckRow checked={data.vehiculeHybrideRechargeable} onChange={v => update('vehiculeHybrideRechargeable', v)} label={isFr ? 'Véhicules hybrides rechargeables' : 'Plug-in hybrid vehicles'} />
        <CheckRow checked={data.vehiculeUtilitaireElectrique} onChange={v => update('vehiculeUtilitaireElectrique', v)} label={isFr ? 'Véhicules utilitaires électriques' : 'Electric utility vehicles'} />
        <CheckRow checked={data.vehiculeVisiteurInconnu} onChange={v => update('vehiculeVisiteurInconnu', v)} label={isFr ? 'Véhicules visiteurs (type inconnu)' : 'Visitor vehicles (unknown type)'} />
        <WarningBox text={isFr ? 'L\'identification précise du type de batterie peut ne pas être possible à l\'arrivée des secours.' : 'Precise identification of battery type may not be possible upon arrival of emergency responders.'} />

        {/* 8.10.6 — Contraintes stationnement */}
        <SubHeading number="8.10.6" title={t.s6} />
        <p className="text-xs font-semibold mb-1" style={{ color: '#6C757D' }}>{isFr ? 'Accès et dégagement' : 'Access and clearance'}</p>
        <div className="grid grid-cols-2 gap-4">
          <TextField label={isFr ? 'Hauteur libre maximale' : 'Maximum clear height'} value={data.hauteurLibreMax} onChange={v => update('hauteurLibreMax', v)} suffix="m / pi" />
          <TextField label={isFr ? 'Largeur des voies de circulation' : 'Width of travel lanes'} value={data.largeurVoies} onChange={v => update('largeurVoies', v)} />
        </div>
        <p className="text-xs font-semibold mt-3 mb-1" style={{ color: '#6C757D' }}>{isFr ? 'Contraintes connues' : 'Known constraints'}</p>
        <CheckRow checked={data.contrainteHauteurLimitee} onChange={v => update('contrainteHauteurLimitee', v)} label={isFr ? 'Hauteur sous plafond limitée' : 'Limited ceiling clearance'} />
        <CheckRow checked={data.contrainteAccesRestreint} onChange={v => update('contrainteAccesRestreint', v)} label={isFr ? 'Accès restreint aux véhicules lourds' : 'Restricted access for heavy vehicles'} />
        <CheckRow checked={data.contrainteRayonsVirage} onChange={v => update('contrainteRayonsVirage', v)} label={isFr ? 'Rayons de virage réduits' : 'Reduced turning radius'} />
        <CheckRow checked={data.contrainteAutres} onChange={v => update('contrainteAutres', v)} label={isFr ? 'Autres' : 'Other'} />
        {data.contrainteAutres && (
          <TextField label={isFr ? 'Préciser' : 'Specify'} value={data.contrainteAutresTexte} onChange={v => update('contrainteAutresTexte', v)} />
        )}

        {/* 8.10.7 — Zones à risque */}
        <SubHeading number="8.10.7" title={t.s7} />
        <p className="text-xs mb-2" style={{ color: '#495057' }}>
          {isFr ? 'Les zones suivantes sont considérées comme des zones à risque accru en cas d\'incendie de batterie lithium-ion :' : 'The following zones are considered high-risk areas in the event of a lithium-ion battery fire:'}
        </p>
        <CheckRow checked={data.zoneAiresRecharge} onChange={v => update('zoneAiresRecharge', v)} label={isFr ? 'Aires de recharge' : 'Charging areas'} />
        <CheckRow checked={data.zoneStationnementInterieur} onChange={v => update('zoneStationnementInterieur', v)} label={isFr ? 'Stationnement intérieur' : 'Indoor parking'} />
        <CheckRow checked={data.zoneProximiteStructures} onChange={v => update('zoneProximiteStructures', v)} label={isFr ? 'Proximité de structures ou locaux techniques' : 'Proximity to structures or technical rooms'} />
        <CheckRow checked={data.zoneAutres} onChange={v => update('zoneAutres', v)} label={isFr ? 'Autres' : 'Other'} />
        {data.zoneAutres && (
          <TextField label={isFr ? 'Préciser' : 'Specify'} value={data.zoneAutresTexte} onChange={v => update('zoneAutresTexte', v)} />
        )}

        {/* 8.10.8 — Coupures énergétiques */}
        <SubHeading number="8.10.8" title={t.s8} />
        <p className="text-xs font-semibold mb-2" style={{ color: '#6C757D' }}>{isFr ? 'Coupure des bornes de recharge' : 'Charging station shutoff'}</p>
        <p className="text-xs font-semibold mb-1" style={{ color: '#495057' }}>{isFr ? 'Dispositif de coupure manuelle' : 'Manual shutoff device'}</p>
        <div className="flex gap-6 mb-2">
          {(['oui', 'non'] as const).map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="dispositifCoupure" checked={data.dispositifCoupureManuelle === opt}
                onChange={() => update('dispositifCoupureManuelle', opt)} style={{ accentColor: '#C0392B' }} />
              <span className="text-sm" style={{ color: '#495057' }}>{opt === 'oui' ? (isFr ? 'Oui' : 'Yes') : (isFr ? 'Non' : 'No')}</span>
            </label>
          ))}
        </div>
        <TextField label={isFr ? 'Localisation' : 'Location'} value={data.localisationCoupureManuelle} onChange={v => update('localisationCoupureManuelle', v)} />
        <TextField label={isFr ? 'Coupure électrique principale du secteur — Localisation' : 'Main sector electrical shutoff — Location'} value={data.localisationCoupureElectrique} onChange={v => update('localisationCoupureElectrique', v)} />
        <WarningBox text={isFr ? 'Avertissement important : la coupure électrique n\'élimine pas le risque thermique associé à une batterie lithium-ion.' : 'Important warning: the electrical shutoff does not eliminate the thermal risk associated with a lithium-ion battery.'} />

        {/* 8.10.9 — Détection vs intervention (texte informatif fixe) */}
        <SubHeading number="8.10.9" title={t.s9} />
        <div className="text-sm space-y-2" style={{ color: '#495057' }}>
          <p className="font-semibold">{isFr ? 'Détection et alarme incendie' : 'Fire detection and alarm'}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{isFr ? 'Les systèmes de détection incendie (fumée, chaleur) peuvent être activés lors d\'un événement impliquant une batterie lithium-ion.' : 'Fire detection systems (smoke, heat) may be activated during an event involving a lithium-ion battery.'}</li>
            <li>{isFr ? 'Ces systèmes ont pour objectif d\'alerter les occupants, de déclencher l\'évacuation, et d\'aviser les services d\'urgence.' : 'These systems aim to alert occupants, trigger evacuation, and notify emergency services.'}</li>
          </ul>
          <p className="font-semibold mt-3">{isFr ? 'Intervention interne — Limites' : 'Internal intervention — Limits'}</p>
          <p>
            <strong>{isFr ? 'La brigade interne ou le personnel du site ne doit pas intervenir directement sur un incendie de batterie lithium-ion.' : 'The internal brigade or site personnel must not intervene directly on a lithium-ion battery fire.'}</strong>
          </p>
          <p className="font-semibold mt-3">{isFr ? 'En cas de suspicion ou de confirmation' : 'In case of suspicion or confirmation'}</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>{isFr ? 'Maintenir une distance de sécurité' : 'Maintain a safety distance'}</li>
            <li>{isFr ? 'Évacuer la zone concernée' : 'Evacuate the affected area'}</li>
            <li>{isFr ? 'Isoler le secteur si possible' : 'Isolate the sector if possible'}</li>
            <li>{isFr ? 'Attendre l\'arrivée des services d\'urgence' : 'Wait for emergency services to arrive'}</li>
          </ul>
          <p className="mt-2">{isFr ? 'Aucune tentative d\'extinction directe ne doit être effectuée par le personnel interne.' : 'No direct extinguishing attempt should be made by internal personnel.'}</p>
        </div>

        {/* 8.10.10 — Mesures de sécurité (texte informatif fixe) */}
        <SubHeading number="8.10.10" title={t.s10} />
        <ul className="text-sm list-disc pl-5 space-y-1" style={{ color: '#495057' }}>
          <li>{isFr ? 'Maintenir une distance sécuritaire minimale autour du véhicule impliqué' : 'Maintain a minimum safe distance around the vehicle involved'}</li>
          <li>{isFr ? 'Tenir compte du risque de réinflammation' : 'Account for the risk of reignition'}</li>
          <li>{isFr ? 'Prévoir une surveillance prolongée post-incident' : 'Plan for extended post-incident monitoring'}</li>
          <li>{isFr ? 'Coordonner étroitement avec les services d\'incendie' : 'Coordinate closely with fire services'}</li>
        </ul>

      </div>
    </div>
  );
}
