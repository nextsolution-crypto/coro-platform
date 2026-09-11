'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, Camera, Upload, X, Check, ExternalLink, Plus } from 'lucide-react';

import api from '@/lib/api';
import SpellCheckedTextarea from './SpellCheckedTextarea';

// ============================================================
// TYPES
// ============================================================

interface Module7SectionProps {
  projectId: string;
  language?: 'fr' | 'en';
}

interface QuartsData {
  jour: { semaine: string; samedi: string; dimanche: string };
  soir: { semaine: string; samedi: string; dimanche: string };
  nuit: { semaine: string; samedi: string; dimanche: string };
  infosSup: string;
}

interface PhotoEntry {
  base64: string;
  fileName: string;
  label: string;
}

type PhotosData = Record<string, PhotoEntry | null>;

const DEFAULT_PHOTO_SLOTS = [
  { key: '01_entree_principale', label: 'Entrée principale / Poste de commandement' },
  { key: '02_point_rassemblement', label: 'Point de rassemblement' },
  { key: '03_plan_mesures', label: 'Plan de mesures d\'urgence' },
  { key: '04_boite_cles', label: 'Boîte à clés' },
  { key: '05_ascenseur', label: 'Ascenseur' },
  { key: '06_escalier_urgence', label: 'Escalier d\'urgence' },
  { key: '07_acces_toit', label: 'Accès au toit' },
  { key: '08_separation_coupe_feu', label: 'Séparation coupe-feu' },
  { key: '09_chute_ordures', label: 'Chute à ordures' },
  { key: '10_chauffage', label: 'Chauffage' },
  { key: '11_ventilation', label: 'Ventilation' },
  { key: '12_salle_electrique', label: 'Salle électrique principale' },
];

// ============================================================
// HELPERS
// ============================================================

const val = (v: any, fallback = '—') =>
  v !== undefined && v !== null && v !== '' ? String(v) : fallback;

const bool = (v: any) => (v === true ? 'Oui' : v === false ? 'Non' : '—');

const listVal = (v: any, fallback = '—') =>
  Array.isArray(v) && v.length > 0 ? v.join(', ') : fallback;

const withUnit = (v: any, unit: string, fallback = '—') =>
  v !== undefined && v !== null && v !== '' && v !== 0 ? `${v}${unit}` : fallback;

const inputStyle = {
  border: '1px solid #CED4DA',
  color: '#2C3E50',
  backgroundColor: '#FFFFFF',
  borderRadius: '4px',
  padding: '6px 10px',
  fontSize: '13px',
  width: '100%',
  outline: 'none',
};

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-6"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E9ECEF',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      <div className="px-5 py-3" style={{ backgroundColor: '#C0392B' }}>
        <h3 className="font-bold text-sm text-white uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide"
      style={{ color: '#C0392B' }}
    >
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-start py-2 gap-4"
      style={{ borderBottom: '1px solid #F8F9FA' }}
    >
      <span
        className="text-sm font-medium w-64 flex-shrink-0"
        style={{ color: '#495057' }}
      >
        {label}
      </span>
      <span
        className="text-sm flex-1 break-words"
        style={{ color: value === '—' ? '#ADB5BD' : '#2C3E50' }}
      >
        {value}
      </span>
    </div>
  );
}

function ReadonlyBadge() {
  return (
    <span
      className="text-xs px-2 py-0.5 ml-2 font-medium"
      style={{
        backgroundColor: '#EBF5FB',
        color: '#2980B9',
        border: '1px solid #AED6F1',
        borderRadius: '3px',
      }}
    >
      Configurateur
    </span>
  );
}

function BooleanChecklist({
  items,
  config,
}: {
  items: Array<{ label: string; key: string }>;
  config: any;
}) {
  return (
    <div>
      {items.map(item => (
        <div
          key={item.key}
          className="flex items-center gap-2 py-1.5"
          style={{ borderBottom: '1px solid #F8F9FA' }}
        >
          <div
            className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: config[item.key] ? '#C0392B' : '#FFFFFF',
              borderColor: config[item.key] ? '#C0392B' : '#CED4DA',
            }}
          >
            {config[item.key] && <span className="text-white text-xs">✓</span>}
          </div>
          <span className="text-sm" style={{ color: '#495057' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module7Section({
  projectId,
  language = 'fr',
}: Module7SectionProps) {
  const router = useRouter();
  const isFirstLoad = useRef(true);

  const [config, setConfig] = useState<any>({});
  const [quarts, setQuarts] = useState<QuartsData>({
    jour: { semaine: '', samedi: '', dimanche: '' },
    soir: { semaine: '', samedi: '', dimanche: '' },
    nuit: { semaine: '', samedi: '', dimanche: '' },
    infosSup: '',
  });
  const [photos, setPhotos] = useState<PhotosData>({});
  // Conservé pour compatibilité avec les données Module7 existantes.
  const [extra, setExtra] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Chargement ────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [configRes, dataRes] = await Promise.all([
          api.get(`/projects/${projectId}/module7/config`),
          api.get(`/projects/${projectId}/module7`),
        ]);

        setConfig(configRes.data || {});

        if (
          dataRes.data?.quartsData &&
          Object.keys(dataRes.data.quartsData).length > 0
        ) {
          setQuarts(dataRes.data.quartsData);
        }

        if (
          dataRes.data?.photosData &&
          Object.keys(dataRes.data.photosData).length > 0
        ) {
          setPhotos(dataRes.data.photosData);
        } else {
          const defaultPhotos: PhotosData = {};
          DEFAULT_PHOTO_SLOTS.forEach(slot => {
            defaultPhotos[slot.key] = {
              base64: '',
              fileName: '',
              label: slot.label,
            };
          });
          setPhotos(defaultPhotos);
        }

        if (dataRes.data?.extraData) {
          setExtra(dataRes.data.extraData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        isFirstLoad.current = false;
      }
    };

    load();
  }, [projectId]);

  // ── Autosave ──────────────────────────────────────────────
  const saveData = useCallback(async () => {
    setSaving(true);

    try {
      await api.put(`/projects/${projectId}/module7`, {
        quartsData: quarts,
        photosData: photos,
        extraData: extra,
      });
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [projectId, quarts, photos, extra]);

  useEffect(() => {
    if (isFirstLoad.current || !isDirty) return;

    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [quarts, photos, extra, isDirty, saveData]);

  // ── Upload photo ──────────────────────────────────────────
  const handlePhotoUpload = (key: string, file: File) => {
    if (!file.type.startsWith('image/')) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const MAX_WIDTH = 1000;
      const scale = Math.min(1, MAX_WIDTH / img.width);
      const targetWidth = Math.round(img.width * scale);
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = compressedDataUrl.split(',')[1];

      setPhotos(prev => {
        const currentLabel = prev[key]?.label;
        const defaultLabel = DEFAULT_PHOTO_SLOTS.find(
          slot => slot.key === key,
        )?.label;

        return {
          ...prev,
          [key]: {
            base64,
            fileName: file.name,
            label: currentLabel || defaultLabel || 'Nouvel emplacement',
          },
        };
      });

      setIsDirty(true);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      alert('Erreur lors du chargement de l\'image.');
    };

    img.src = objectUrl;
  };

  const removePhoto = (key: string) => {
    setPhotos(prev => ({ ...prev, [key]: null }));
    setIsDirty(true);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
        <span
          className="text-sm animate-pulse"
          style={{ color: '#ADB5BD' }}
        >
          Chargement...
        </span>
      </div>
    );
  }

  const isIndustriel =
    config.buildingType === 'Industriel' ||
    config.usagePrincipal?.startsWith('F');

  const detectors = [
    {
      label: 'Détecteur de monoxyde de carbone (CO)',
      present: config.detecteurCO,
      lieu: config.detecteurCOLieu,
      seuil1: config.detecteurCOSeuil1
        ? `${config.detecteurCOSeuil1} ppm`
        : undefined,
      seuil2: config.detecteurCOSeuil2
        ? `${config.detecteurCOSeuil2} ppm`
        : undefined,
    },
    {
      label: 'Détecteur de gaz naturel',
      present: config.detecteurGazNaturel,
      lieu: config.detecteurGazNaturelLieu,
    },
    {
      label: 'Détecteur de propane',
      present: config.detecteurPropane,
    },
    {
      label: 'Détecteur d\'ammoniac',
      present: config.detecteurAmmoniac,
      seuil1: config.detecteurAmmoniacSeuil1
        ? `${config.detecteurAmmoniacSeuil1} ppm`
        : undefined,
      seuil2: config.detecteurAmmoniacSeuil2
        ? `${config.detecteurAmmoniacSeuil2} ppm`
        : undefined,
    },
    {
      label: 'Détecteur de fréon',
      present: config.detecteurFreon,
    },
    {
      label: 'Détecteur d\'oxygène (O₂)',
      present: config.detecteurO2,
    },
    {
      label: 'Détecteur FM200',
      present: config.detecteurFM200,
    },
    {
      label: 'Détecteur de dioxyde de carbone (CO₂)',
      present: config.detecteurCO2,
    },
  ].filter(detector => detector.present);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: '#ADB5BD' }}
          >
            Module 7
          </p>
          <h1
            className="text-3xl font-black uppercase leading-tight"
            style={{ color: '#2C3E50' }}
          >
            DESCRIPTION DU SITE
          </h1>
          <h2
            className="text-xl font-black uppercase leading-tight"
            style={{ color: '#6C757D' }}
          >
            ET ÉQUIPEMENTS DE SÉCURITÉ
          </h2>
          <div
            className="h-1 w-16 mt-2"
            style={{ backgroundColor: '#C0392B' }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs">
            {saving && (
              <span
                className="flex items-center gap-1.5"
                style={{ color: '#2980B9' }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#2980B9' }}
                />
                Sauvegarde...
              </span>
            )}

            {!saving && lastSaved && !isDirty && (
              <span
                className="flex items-center gap-1.5"
                style={{ color: '#27AE60' }}
              >
                <Check size={12} />
                Sauvegardé {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <button
            onClick={() => router.push(`/configurator/${projectId}`)}
            className="flex items-center gap-2 text-xs px-3 py-2 transition-colors"
            style={{
              border: '1px solid #DEE2E6',
              color: '#6C757D',
              borderRadius: '4px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#F8F9FA';
              e.currentTarget.style.color = '#2C3E50';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6C757D';
            }}
          >
            <Settings size={13} />
            Modifier dans le configurateur
            <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Note lecture seule */}
      <div
        className="flex items-center gap-2 px-4 py-3 mb-6"
        style={{
          backgroundColor: '#EBF5FB',
          border: '1px solid #AED6F1',
          borderRadius: '4px',
        }}
      >
        <span style={{ color: '#2980B9', fontSize: '13px' }}>ℹ</span>
        <p className="text-xs" style={{ color: '#2980B9' }}>
          Les données marquées <strong>Configurateur</strong> proviennent de
          la configuration du projet. Pour les modifier, retournez au
          configurateur. Les photos et les informations supplémentaires sur
          l&apos;occupation sont éditables directement ici.
        </p>
      </div>

      {/* ── 7.1 DESCRIPTION GÉNÉRALE ── */}
      <SectionCard title="7.1 — Description générale">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Informations sur le bâtiment <ReadonlyBadge />
        </p>

        <InfoRow label="Type de bâtiment" value={val(config.buildingType)} />
        <InfoRow label="Usage principal" value={val(config.usagePrincipal)} />
        <InfoRow label="Usage secondaire" value={val(config.usageSecondaire)} />
        <InfoRow
          label="Capacité maximale réglementaire"
          value={val(config.capaciteMaxReglementaire)}
        />
        <InfoRow
          label="Traitements médicaux sur place"
          value={bool(config.traitementsMedicauxSurPlace)}
        />
        <InfoRow label="Nombre de sous-sols" value={val(config.basements, '0')} />
        <InfoRow label="Nombre d'étages" value={val(config.floors, '0')} />
        <InfoRow label="Superficie (pi²)" value={val(config.superficie)} />
        <InfoRow
          label="Année de construction"
          value={val(config.anneeConstruction)}
        />
        <InfoRow
          label="Dernière rénovation majeure"
          value={val(config.derniereRenovation)}
        />
        <InfoRow
          label="Construction — Étages supérieurs"
          value={val(config.typeConstructionEtages)}
        />
        <InfoRow
          label="Construction — Toit"
          value={val(config.typeConstructionToit)}
        />
        <InfoRow
          label="13e étage présent"
          value={bool(config.treizeEtage)}
        />
        <InfoRow
          label="Bâtiment à grande hauteur (+18 m)"
          value={bool(config.hauteurBatiment)}
        />
        {config.infosBatiment && (
          <InfoRow
            label="Informations supplémentaires"
            value={val(config.infosBatiment)}
          />
        )}

        <SubHeading>Accès</SubHeading>
        <InfoRow
          label="Accès aux sous-sols"
          value={listVal(config.accesSousSol)}
        />
        {config.accesSousSolDetails && (
          <InfoRow
            label="Détails — accès aux sous-sols"
            value={val(config.accesSousSolDetails)}
          />
        )}
        <InfoRow
          label="Accès aux étages"
          value={listVal(config.accesEtages)}
        />
        {config.accesEtagesDetails && (
          <InfoRow
            label="Détails — accès aux étages"
            value={val(config.accesEtagesDetails)}
          />
        )}

        <SubHeading>Occupation et sécurité</SubHeading>
        <InfoRow
          label="Bâtiment multi-locataires"
          value={bool(config.multiLocataires)}
        />
        {config.multiLocataires && (
          <InfoRow
            label="Nombre de locataires"
            value={val(config.nbLocataires)}
          />
        )}
        <InfoRow label="Lieu de sommeil" value={bool(config.lieuSommeil)} />
        <InfoRow
          label="Sécurité présente 24 h / 24"
          value={bool(config.securite24h)}
        />
        <InfoRow
          label="Agent de sécurité"
          value={bool(config.agentSecurite)}
        />
        <InfoRow
          label="Poste de surveillance"
          value={val(config.posteSurveillance)}
        />
        <InfoRow
          label="Contrôle d'accès"
          value={bool(config.controleAcces)}
        />
        <InfoRow
          label="Caméras de surveillance"
          value={bool(config.cameras)}
        />

        <SubHeading>Emplacements opérationnels</SubHeading>
        <InfoRow
          label="Poste de commandement"
          value={val(config.posteCommandement)}
        />
        <InfoRow
          label="Point de rassemblement principal"
          value={val(config.pointRassemblement)}
        />
        {config.pointRassemblement2 && (
          <InfoRow
            label="Point de rassemblement secondaire"
            value={val(config.pointRassemblement2)}
          />
        )}
        {config.lieuAccueilTemporaire && (
          <InfoRow
            label="Lieu d'accueil temporaire"
            value={val(config.lieuAccueilTemporaire)}
          />
        )}
        {config.zoneConfinement && (
          <InfoRow
            label="Zone de confinement"
            value={val(config.zoneConfinement)}
          />
        )}
        {config.zoneRafraichissement && (
          <InfoRow
            label="Zone de rafraîchissement"
            value={val(config.zoneRafraichissement)}
          />
        )}
        <InfoRow
          label="Boîte à clés pompier"
          value={val(config.boiteClePompier)}
        />
        <InfoRow
          label="Trousseau de clés pompier"
          value={bool(config.trousseClesPompier)}
        />
        {config.trousseClesPompier && (
          <InfoRow
            label="Localisation du trousseau pompier"
            value={val(config.trousseClesPompierLieu)}
          />
        )}
        <InfoRow
          label="Lieu de conservation du document"
          value={val(config.lieuDocument)}
        />
        <InfoRow
          label="Dernière révision du PSI"
          value={val(config.psiDerniereRevision)}
        />
        <InfoRow
          label="Programme d'inspection et d'entretien"
          value={bool(config.programmeInspectionEntretien)}
        />

        {config.signalisationIssue && (
          <>
            <SubHeading>Signalisation d'issue</SubHeading>
            <InfoRow
              label="Signalisation d'issue présente"
              value={bool(config.signalisationIssue)}
            />
            <InfoRow
              label="Type"
              value={val(config.signalisationIssueType)}
            />
            <InfoRow
              label="Dernière inspection"
              value={val(config.signalisationIssueDerniereInspection)}
            />
          </>
        )}

        {config.portesIssueExposees && (
          <>
            <SubHeading>Portes d'issue exposées</SubHeading>
            <InfoRow
              label="Portes d'issue exposées à l'obstruction"
              value={bool(config.portesIssueExposees)}
            />
            <InfoRow
              label="Mesure en place"
              value={val(config.portesIssueMesure)}
            />
          </>
        )}

        {/* Occupation des lieux — lecture seule configurateur */}
        <SubHeading>Occupation des lieux</SubHeading>
        <div className="mb-2 flex items-center">
          <ReadonlyBadge />
        </div>

        {config.quartsOccupation?.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm min-w-[680px]"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  {[
                    'Quart de travail',
                    'Semaine',
                    'Samedi',
                    'Dimanche',
                  ].map(header => (
                    <th
                      key={header}
                      className="text-left px-3 py-2 text-xs font-semibold"
                      style={{
                        color: '#495057',
                        border: '1px solid #E9ECEF',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.quartsOccupation.map((q: any, idx: number) => (
                  <tr key={idx}>
                    <td
                      className="px-3 py-2 text-xs font-medium"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(q.nomQuart)} ({val(q.heureDebut)} –{' '}
                      {val(q.heureFin)})
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#495057',
                      }}
                    >
                      {val(q.occupantsSemaine)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#495057',
                      }}
                    >
                      {val(q.occupantsSamedi)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#495057',
                      }}
                    >
                      {val(q.occupantsDimanche)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#ADB5BD' }}>
            Aucun quart de travail déclaré
          </p>
        )}

        <div className="mt-3">
          <label
            className="text-xs font-medium mb-1 block"
            style={{ color: '#495057' }}
          >
            Informations supplémentaires
          </label>
          <SpellCheckedTextarea
            value={quarts.infosSup}
            onChange={value => {
              setQuarts(prev => ({ ...prev, infosSup: value }));
              setIsDirty(true);
            }}
            placeholder="Informations supplémentaires sur l'occupation..."
            rows={2}
            language={language}
            style={{ ...inputStyle, resize: 'none', width: '100%' }}
          />
        </div>

        {config.personnelHandicap && (
          <>
            <SubHeading>
              Personnes nécessitant une assistance à l'évacuation (PPNAE)
            </SubHeading>
            <InfoRow
              label="Présence de PPNAE"
              value={bool(config.personnelHandicap)}
            />
            <InfoRow
              label="Types de limitations"
              value={listVal(config.ppnaeTypesLimitations)}
            />
            <InfoRow
              label="Mesures prévues"
              value={listVal(config.ppnaeMesures)}
            />
            <InfoRow
              label="Registre à jour"
              value={bool(config.ppnaeRegistreAJour)}
            />
          </>
        )}
      </SectionCard>

      {/* ── 7.2 MÉCANIQUE DU BÂTIMENT ── */}
      <SectionCard title="7.2 — Mécanique du bâtiment">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Mécanique du bâtiment <ReadonlyBadge />
        </p>

        <SubHeading>Ascenseurs</SubHeading>
        <InfoRow label="Ascenseurs présents" value={bool(config.ascenseurs)} />
        {config.ascenseurs && (
          <>
            <InfoRow
              label="Nombre d'ascenseurs"
              value={val(config.nbAscenseurs)}
            />
            <InfoRow label="Type" value={val(config.typeAscenseur)} />
            <InfoRow
              label="Emplacement salle mécanique"
              value={val(config.salleAscenseur)}
            />
            <InfoRow
              label="Ascenseur pompier"
              value={bool(config.ascenseurPompier)}
            />
            {config.ascenseurPompier && (
              <InfoRow
                label="Ascenseur pompier — lequel"
                value={val(config.ascenseurPompierLequel)}
              />
            )}
            <InfoRow
              label="Rappel d'ascenseurs — emplacement"
              value={val(config.rappelAscenseursLieu)}
            />
            <InfoRow
              label="Téléphone dans les ascenseurs"
              value={bool(config.telephoneAscenseurs)}
            />
            <InfoRow
              label="Fonctionne sur alimentation de secours"
              value={bool(config.fonctionneSecours)}
            />
          </>
        )}

        <SubHeading>Escaliers</SubHeading>
        <InfoRow
          label="Escaliers pressurisés"
          value={bool(config.escaliersPressurises)}
        />
        <InfoRow
          label="Nombre d'escaliers"
          value={val(config.nbEscaliers)}
        />

        <SubHeading>Toit</SubHeading>
        <InfoRow label="Toit verrouillé" value={bool(config.toitVerrouille)} />
        <InfoRow label="Accès au toit" value={val(config.accesToit)} />

        <SubHeading>Séparation coupe-feu</SubHeading>
        <InfoRow
          label="Présence"
          value={bool(config.separationCoupeFeu)}
        />
        {config.separationCoupeFeu && (
          <InfoRow
            label="Emplacement"
            value={val(config.separationCoupeFeuLieu)}
          />
        )}

        <SubHeading>Déchets et matières résiduelles</SubHeading>
        <InfoRow
          label="Emplacement du bac"
          value={val(config.emplacementBac)}
        />
        <InfoRow label="Compacteur présent" value={bool(config.compacteur)} />
        {config.compacteur && (
          <>
            <InfoRow
              label="Gicleurs dans le compacteur"
              value={bool(config.compacteurGicleurs)}
            />
            {config.compacteurGicleurs && (
              <>
                <InfoRow
                  label="Type de gicleurs du compacteur"
                  value={val(config.compacteurGicleursType)}
                />
                <InfoRow
                  label="Vanne d'isolement du compacteur"
                  value={val(config.compacteurVanneIsolement)}
                />
              </>
            )}
          </>
        )}
        <InfoRow
          label="Chute à déchets présente"
          value={bool(config.chuteADechets)}
        />

        <SubHeading>CVAC</SubHeading>
        <InfoRow label="Système CVAC présent" value={bool(config.cvac)} />
        {config.cvac && (
          <>
            <InfoRow label="Type de CVAC" value={val(config.cvacType)} />
            <InfoRow
              label="Localisation"
              value={val(config.cvacLocalisation)}
            />
          </>
        )}
        <InfoRow
          label="Type de chauffage"
          value={val(config.typeChautfage)}
        />
        <InfoRow
          label="Type de refroidissement"
          value={val(config.typeRefroidissement)}
        />
        <InfoRow
          label="Désenfumage"
          value={bool(config.desenfumage)}
        />
        {config.desenfumage && (
          <InfoRow
            label="Emplacement désenfumage"
            value={val(config.desenfumageLieu)}
          />
        )}

        <SubHeading>Gaz et combustibles</SubHeading>
        <InfoRow label="Gaz naturel présent" value={bool(config.gazNaturel)} />
        {config.gazNaturel && (
          <InfoRow
            label="Localisation entrée de gaz naturel"
            value={val(config.gazNaturelLieu)}
          />
        )}
        <InfoRow label="Propane présent" value={bool(config.propane)} />
        {config.propane && (
          <InfoRow
            label="Localisation du propane"
            value={val(config.propaneLieu)}
          />
        )}

        {config.registresCoupeFeu && (
          <>
            <SubHeading>Registres coupe-feu / contrôle de fumée</SubHeading>
            <InfoRow
              label="Présence"
              value={bool(config.registresCoupeFeu)}
            />
            <InfoRow
              label="Nombre approximatif"
              value={val(config.registresCoupeFeuNombre)}
            />
            <InfoRow
              label="Dernière inspection"
              value={val(config.registresCoupeFeuDerniereInspection)}
            />
            <InfoRow
              label="Rapport disponible"
              value={bool(config.registresCoupeFeuRapport)}
            />
          </>
        )}

        <SubHeading>Salle électrique</SubHeading>
        <InfoRow
          label="Emplacement"
          value={val(config.salleElectrique)}
        />

        <SubHeading>Alimentation de secours</SubHeading>
        <InfoRow
          label="Génératrice présente"
          value={bool(config.generatrice)}
        />
        {config.generatrice && (
          <>
            <InfoRow
              label="Nombre de génératrices"
              value={val(config.nbGeneratrices)}
            />
            <InfoRow
              label="Nom / identification"
              value={val(config.generatriceNom)}
            />
            <InfoRow
              label="Emplacement"
              value={val(config.generatriceLieu)}
            />
            <InfoRow
              label="Carburant"
              value={val(config.generatriceCarburant)}
            />
            <InfoRow
              label="Autonomie"
              value={withUnit(config.autonomieGeneratrice, ' h')}
            />
            <InfoRow
              label="Capacité du réservoir"
              value={withUnit(config.capaciteReservoir, ' L')}
            />

            <InfoRow
              label="Réservoirs auxiliaires"
              value={bool(config.reservoirsAuxiliaires)}
            />
            {config.reservoirsAuxiliaires && (
              <>
                <InfoRow
                  label="Emplacement des réservoirs auxiliaires"
                  value={val(config.reservoirsAuxiliairesLieu)}
                />
                <InfoRow
                  label="Capacité des réservoirs auxiliaires"
                  value={withUnit(config.reservoirsAuxiliairesCapacite, ' L')}
                />
                <InfoRow
                  label="Autonomie totale"
                  value={withUnit(config.autonomieTotale, ' h')}
                />
              </>
            )}

            {config.generatriceEquipements?.length > 0 && (
              <InfoRow
                label="Équipements sur alimentation de secours"
                value={listVal(config.generatriceEquipements)}
              />
            )}

            {config.generatriceEquipementsPersonnalises?.length > 0 && (
              <InfoRow
                label="Autres équipements alimentés"
                value={config.generatriceEquipementsPersonnalises
                  .map((item: any) => item?.nom)
                  .filter(Boolean)
                  .join(', ') || '—'}
              />
            )}
          </>
        )}

        <SubHeading>Vannes d'arrêt</SubHeading>
        <InfoRow
          label="Salle de gicleurs"
          value={val(config.vannesArretSalleGicleurs)}
        />
        <InfoRow
          label="Entrée de gaz naturel"
          value={val(config.vannesArretGazNaturel)}
        />
        <InfoRow
          label="Arrivée d'eau domestique"
          value={val(config.vannesArretEauDomestique)}
        />
        <InfoRow
          label="Salle électrique"
          value={val(config.vannesArretSalleElectrique)}
        />
      </SectionCard>

      {/* ── 7.3 RÉSEAU D'ALARME INCENDIE ── */}
      <SectionCard title="7.3 — Réseau d'alarme incendie">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Alarme incendie <ReadonlyBadge />
        </p>

        <InfoRow
          label="Panneau d'alarme incendie présent"
          value={bool(config.panneauAlarme)}
        />
        <InfoRow
          label="Localisation du panneau"
          value={val(config.panneauLocalisation)}
        />
        <InfoRow
          label="Marque / Modèle"
          value={`${val(config.panneauMarque, '')} ${val(
            config.panneauModele,
            '',
          )}`.trim() || '—'}
        />
        <InfoRow label="Type de panneau" value={val(config.panneauType)} />
        <InfoRow
          label="Technologie"
          value={val(config.panneauTechno)}
        />
        {config.panneauType === 'DOUBLE' && (
          <InfoRow
            label="Heures de fonctionnement — double étape"
            value={val(config.heuresFonctionnement)}
          />
        )}
        <InfoRow
          label="Panneau annonciateur"
          value={bool(config.panneauAnnonciateurDistance)}
        />
        {config.panneauAnnonciateurDistance && (
          <InfoRow
            label="Emplacement annonciateur"
            value={val(config.panneauAnnonciateurLieu)}
          />
        )}
        <InfoRow
          label="Téléphone pompier"
          value={bool(config.telephonePompier)}
        />

        <SubHeading>Télésurveillance</SubHeading>
        <InfoRow
          label="Télésurveillance"
          value={bool(config.teleSurveillance)}
        />
        {config.teleSurveillance && (
          <>
            <InfoRow
              label="Centrale de surveillance"
              value={val(config.centraleSurveillance)}
            />
            <InfoRow
              label="Téléphone de la centrale"
              value={val(config.centraleTelephone)}
            />
            <InfoRow
              label="Code client"
              value={val(config.centraleCodeClient)}
            />
          </>
        )}

        <SubHeading>Communications d'urgence</SubHeading>
        <InfoRow
          label="Communication phonique"
          value={bool(config.systemePhonic)}
        />
        {config.systemePhonic && (
          <>
            <InfoRow
              label="Type de système phonique"
              value={val(config.systemePhonicType)}
            />
            <InfoRow
              label="Messages automatisés"
              value={bool(config.messagesAutomatises)}
            />
          </>
        )}
        <InfoRow
          label="Radios de communication"
          value={bool(config.radiosCommunication)}
        />
        {config.radiosCommunication && (
          <InfoRow label="Nombre de radios" value={val(config.nbRadios)} />
        )}
        <InfoRow
          label="Intercom d'urgence"
          value={bool(config.intercomUrgence)}
        />

        <SubHeading>Relais auxiliaires</SubHeading>
        <BooleanChecklist
          config={config}
          items={[
            {
              label: 'Appel à la centrale d\'alarme',
              key: 'teleSurveillance',
            },
            {
              label: 'Arrêt de la ventilation',
              key: 'arretVentilation',
            },
            {
              label: 'Rappel des ascenseurs',
              key: 'rappelAscenseurs',
            },
            {
              label: 'Système de désenfumage',
              key: 'desenfumageAutomatique',
            },
            {
              label: 'Déverrouillage des zones à accès contrôlé',
              key: 'deverrouillagePorces',
            },
            {
              label: 'Fermeture des portes coupe-feu',
              key: 'fermeturePortesCoupeFeu',
            },
          ]}
        />

        <SubHeading>Éléments de détection</SubHeading>
        <BooleanChecklist
          config={config}
          items={[
            {
              label: 'Station manuelle d\'alarme incendie',
              key: 'stationManuelle',
            },
            { label: 'Détecteur de chaleur', key: 'detecteurChaleur' },
            { label: 'Détecteur de fumée', key: 'detecteurFumee' },
            {
              label: 'Détecteur de débit de gicleurs',
              key: 'detecteurDebitGicleurs',
            },
          ]}
        />

        {config.s1001Interconnexions?.length > 0 && (
          <>
            <SubHeading>Systèmes intégrés — CAN/ULC-S1001</SubHeading>
            <InfoRow
              label="Interconnexions déclarées"
              value={listVal(config.s1001Interconnexions)}
            />
            <InfoRow
              label="Dernier essai intégré"
              value={val(config.s1001DernierEssai)}
            />
            <InfoRow
              label="Rapport disponible"
              value={bool(config.s1001RapportDisponible)}
            />
            <InfoRow
              label="Coordonnateur des essais"
              value={val(config.s1001Coordonnateur)}
            />
          </>
        )}
      </SectionCard>

      {/* ── 7.4 GICLEURS ET PROTECTION INCENDIE ── */}
      <SectionCard title="7.4 — Système de gicleurs et protection incendie">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Système d'extinction incendie <ReadonlyBadge />
        </p>

        <InfoRow
          label="Réseau de gicleurs"
          value={bool(config.gicleurs)}
        />

        {config.gicleurs && (
          <>
            <InfoRow
              label="Localisation salle des gicleurs"
              value={val(config.salleGicleurs)}
            />

            {config.gicleursSystemes?.length > 0 && (
              <div className="overflow-x-auto mt-3">
                <table
                  className="w-full text-sm min-w-[620px]"
                  style={{ borderCollapse: 'collapse' }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#F8F9FA' }}>
                      {[
                        'Type de réseau',
                        'Secteurs / lieux desservis',
                        'Couverture complète',
                      ].map(header => (
                        <th
                          key={header}
                          className="text-left px-3 py-2 text-xs font-semibold"
                          style={{
                            color: '#495057',
                            border: '1px solid #E9ECEF',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.gicleursSystemes.map(
                      (systeme: any, idx: number) => (
                        <tr key={idx}>
                          <td
                            className="px-3 py-2 text-xs"
                            style={{
                              border: '1px solid #E9ECEF',
                              color: '#2C3E50',
                            }}
                          >
                            {val(systeme.type)}
                          </td>
                          <td
                            className="px-3 py-2 text-xs"
                            style={{
                              border: '1px solid #E9ECEF',
                              color: '#495057',
                            }}
                          >
                            {val(systeme.lieu)}
                          </td>
                          <td
                            className="px-3 py-2 text-xs text-center"
                            style={{
                              border: '1px solid #E9ECEF',
                              color: '#495057',
                            }}
                          >
                            {bool(systeme.complet)}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <SubHeading>Équipements du réseau</SubHeading>
            <InfoRow
              label="Pompe incendie"
              value={bool(config.pompeIncendie)}
            />
            {config.pompeIncendie && (
              <>
                <InfoRow
                  label="Localisation de la pompe"
                  value={val(config.pompeIncendieLieu)}
                />
                <InfoRow
                  label="Débit (GAPM/USGPM)"
                  value={val(config.gapmUsgpm)}
                />
              </>
            )}
            <InfoRow
              label="Boyau incendie"
              value={bool(config.boyauIncendie)}
            />
            <InfoRow
              label="Cabinet de boyau"
              value={bool(config.boyauCabinet)}
            />
            <InfoRow
              label="Prise de refoulement"
              value={bool(config.priseRefoulement)}
            />
            <InfoRow
              label="Raccord pompier"
              value={bool(config.raccordPompier)}
            />
            {config.raccordPompier && (
              <InfoRow
                label="Emplacement du raccord pompier"
                value={val(config.raccordPompierLieu)}
              />
            )}
            <InfoRow
              label="Bornes-fontaines"
              value={bool(config.bornesFontaine)}
            />
            {config.bornesFontaine && (
              <InfoRow
                label="Emplacement des bornes-fontaines"
                value={val(config.bornesFontaineLieu)}
              />
            )}
            <InfoRow
              label="Vannes d'isolement"
              value={bool(config.vannesIsolement)}
            />
            {config.vannesIsolement && (
              <InfoRow
                label="Emplacement des vannes"
                value={val(config.vannesIsolementLieu)}
              />
            )}
            <InfoRow label="Valve 2½" value={bool(config.valve2_5)} />
            {config.valve2_5 && (
              <InfoRow
                label="Localisation valve 2½"
                value={val(config.valve2_5Lieu)}
              />
            )}
            <InfoRow label="Valve 1½" value={bool(config.valve1_5)} />
            {config.valve1_5 && (
              <InfoRow
                label="Localisation valve 1½"
                value={val(config.valve1_5Lieu)}
              />
            )}
          </>
        )}

        {(config.systemeExtinctionFixe ||
          config.systemePreAction ||
          config.systemeHalogen ||
          config.systemeCO2) && (
          <>
            <SubHeading>Systèmes spécialisés d'extinction</SubHeading>

            <InfoRow
              label="Système d'extinction fixe"
              value={bool(config.systemeExtinctionFixe)}
            />
            {config.systemeExtinctionFixe && (
              <InfoRow
                label="Emplacement — système fixe"
                value={val(config.systemeExtinctionFixeLieu)}
              />
            )}

            <InfoRow
              label="Système préaction"
              value={bool(config.systemePreAction)}
            />
            {config.systemePreAction && (
              <InfoRow
                label="Emplacement — préaction"
                value={val(config.systemePreActionLieu)}
              />
            )}

            <InfoRow
              label="Système halogéné"
              value={bool(config.systemeHalogen)}
            />
            {config.systemeHalogen && (
              <InfoRow
                label="Emplacement — système halogéné"
                value={val(config.systemeHalogenLieu)}
              />
            )}

            <InfoRow
              label="Système CO₂"
              value={bool(config.systemeCO2)}
            />
            {config.systemeCO2 && (
              <InfoRow
                label="Emplacement — système CO₂"
                value={val(config.systemeCO2Lieu)}
              />
            )}
          </>
        )}
      </SectionCard>

      {/* ── 7.5 MATIÈRES DANGEREUSES ── */}
      <SectionCard title="7.5 — Matières dangereuses">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Matières dangereuses <ReadonlyBadge />
        </p>

        <InfoRow
          label="Matières dangereuses présentes"
          value={bool(config.matieresDangereuses)}
        />

        {config.matieresList?.length > 0 ? (
          <div className="overflow-x-auto mb-4">
            <table
              className="w-full text-sm min-w-[980px]"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ backgroundColor: '#C0392B' }}>
                  {[
                    'Nom',
                    'No UN',
                    'Utilisation',
                    'Emplacement précis',
                    'Qté max',
                    'TMD',
                    'SIMDUT',
                    'Signal. TMD',
                  ].map(header => (
                    <th
                      key={header}
                      className="text-left px-3 py-2 text-xs font-semibold text-white"
                      style={{ border: '1px solid #A93226' }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.matieresList.map((m: any, idx: number) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA',
                    }}
                  >
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(m.nom)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(m.numeroUN)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(m.utilisation)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(m.emplacementPrecis || m.quantiteEmplacement)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(m.quantiteMax)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{ border: '1px solid #E9ECEF' }}
                    >
                      {bool(m.tmd)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{ border: '1px solid #E9ECEF' }}
                    >
                      {bool(m.simdut)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{ border: '1px solid #E9ECEF' }}
                    >
                      {bool(m.signalisationTMD)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: '#ADB5BD' }}>
            Aucune matière dangereuse déclarée
          </p>
        )}

        {config.matieresDangereuses && (
          <InfoRow
            label="PSI accessible à l'entrée principale"
            value={bool(config.psiEntreePrincipale)}
          />
        )}

        <InfoRow
          label="Ammoniac présent"
          value={bool(config.ammoniac)}
        />
        <InfoRow
          label="Batteries lithium présentes"
          value={bool(config.batteriesLithium)}
        />

        <SubHeading>Trousse de déversement</SubHeading>
        <InfoRow
          label="Présente"
          value={bool(config.trousseDeversement)}
        />
        {config.trousseDeversement &&
          config.trousseDeversementListe?.length > 0 &&
          config.trousseDeversementListe.map((item: any, idx: number) => (
            <InfoRow
              key={idx}
              label={`Emplacement ${idx + 1}`}
              value={val(item.lieu)}
            />
          ))}
      </SectionCard>

      {/* ── 7.6 EXTINCTEURS PORTATIFS ── */}
      <SectionCard title="7.6 — Extincteurs portatifs">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Extincteurs portatifs <ReadonlyBadge />
        </p>

        <InfoRow
          label="Extincteurs portatifs présents"
          value={bool(config.extincteurPortatif)}
        />

        {config.extincteurPortatif && (
          <>
            <div
              className="p-4 my-4"
              style={{
                backgroundColor: '#F8F9FA',
                border: '1px solid #E9ECEF',
                borderRadius: '4px',
              }}
            >
              <p
                className="text-xs font-semibold mb-2"
                style={{ color: '#495057' }}
              >
                Utilisation :
              </p>
              <ol
                className="text-xs space-y-1"
                style={{
                  color: '#495057',
                  paddingLeft: '16px',
                  listStyle: 'decimal',
                }}
              >
                {[
                  'Alerte : Prévenez immédiatement les occupants à proximité.',
                  'Avertisseur : Activez la station manuelle d\'alarme incendie la plus proche.',
                  'Sécurité personnelle : Assurez-vous que votre sécurité n\'est pas en danger.',
                  'Préparation : Retirez l\'extincteur de son support.',
                  'Positionnement : Placez-vous entre le feu et une sortie pour assurer une voie de fuite.',
                  'Approche : Avancez à une distance de 2-3 mètres (6-10 pieds) du feu.',
                  'Activation : Retirez la goupille en la tournant et en la tirant pour briser le scellé.',
                  'Ciblage : Dirigez le boyau ou la buse vers la base des flammes.',
                  'Extinction : Appuyez sur le levier et balayez la base des flammes.',
                  'Départ : Déposez l\'extincteur au bas du mur et évacuez.',
                  'Point de rassemblement : Rejoignez le point de rassemblement extérieur.',
                ].map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>

            {config.extincteursList?.length > 0 ? (
              <div className="overflow-x-auto">
                <table
                  className="w-full text-sm"
                  style={{ borderCollapse: 'collapse' }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#F8F9FA' }}>
                      {['Type d\'extincteur', 'Localisation'].map(header => (
                        <th
                          key={header}
                          className="text-left px-3 py-2 text-xs font-semibold"
                          style={{
                            color: '#495057',
                            border: '1px solid #E9ECEF',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {config.extincteursList.map((ex: any, idx: number) => (
                      <tr key={idx}>
                        <td
                          className="px-3 py-2 text-xs font-medium"
                          style={{
                            border: '1px solid #E9ECEF',
                            color: '#2C3E50',
                          }}
                        >
                          {val(ex.type)}
                        </td>
                        <td
                          className="px-3 py-2 text-xs"
                          style={{
                            border: '1px solid #E9ECEF',
                            color: '#6C757D',
                          }}
                        >
                          {val(ex.lieu)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm" style={{ color: '#ADB5BD' }}>
                Aucun extincteur détaillé
              </p>
            )}
          </>
        )}
      </SectionCard>

      {/* ── 7.7 PREMIERS SOINS ── */}
      <SectionCard title="7.7 — Équipements de premiers soins">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Équipements disponibles sur le site <ReadonlyBadge />
        </p>

        {config.equipementsSoins?.length > 0 ? (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              style={{ borderCollapse: 'collapse' }}
            >
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  {['Équipement', 'Quantité', 'Emplacement'].map(header => (
                    <th
                      key={header}
                      className="text-left px-3 py-2 text-xs font-semibold"
                      style={{
                        color: '#495057',
                        border: '1px solid #E9ECEF',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.equipementsSoins.map((eq: any, idx: number) => (
                  <tr key={idx}>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(eq.type)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs text-center"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#2C3E50',
                      }}
                    >
                      {val(eq.quantite)}
                    </td>
                    <td
                      className="px-3 py-2 text-xs"
                      style={{
                        border: '1px solid #E9ECEF',
                        color: '#6C757D',
                      }}
                    >
                      {val(eq.lieu)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#ADB5BD' }}>
            Aucun équipement déclaré
          </p>
        )}
      </SectionCard>

      {/* ── 7.8 DÉTECTEURS DE GAZ ── */}
      <SectionCard title="7.8 — Détecteurs de gaz">
        <p
          className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Détecteurs de gaz <ReadonlyBadge />
        </p>

        {detectors.length > 0 ? (
          detectors.map((detector, idx) => (
            <div key={idx} className="mb-4">
              <p
                className="text-xs font-bold mb-2"
                style={{ color: '#495057' }}
              >
                {detector.label}
              </p>

              <InfoRow label="Présent" value={bool(detector.present)} />
              {detector.seuil1 && (
                <InfoRow
                  label="Seuil d'activation minimal"
                  value={detector.seuil1}
                />
              )}
              {detector.seuil2 && (
                <InfoRow
                  label="Seuil d'activation maximal"
                  value={detector.seuil2}
                />
              )}
              {'lieu' in detector && detector.lieu && (
                <InfoRow
                  label="Emplacement"
                  value={val(detector.lieu)}
                />
              )}
            </div>
          ))
        ) : (
          <p className="text-sm" style={{ color: '#ADB5BD' }}>
            Aucun détecteur de gaz déclaré
          </p>
        )}
      </SectionCard>

      {/* ── 7.9 PHOTOS ── */}
      <SectionCard title="7.9 — Photos des équipements de protection">
        <p
          className="text-xs font-semibold mb-4 flex items-center"
          style={{ color: '#6C757D' }}
        >
          Photos des équipements
          <span
            className="text-xs px-2 py-0.5 ml-2 font-medium"
            style={{
              backgroundColor: '#EAFAF1',
              color: '#27AE60',
              border: '1px solid #A9DFBF',
              borderRadius: '3px',
            }}
          >
            Éditable
          </span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(photos)
            .filter(([_, photo]) => photo !== null)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, photo]) =>
              photo ? (
                <div
                  key={key}
                  style={{
                    border: '1px solid #E9ECEF',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-3 py-2"
                    style={{ backgroundColor: '#C0392B' }}
                  >
                    <input
                      type="text"
                      value={photo.label || ''}
                      onChange={e => {
                        setPhotos(prev => ({
                          ...prev,
                          [key]: { ...photo, label: e.target.value },
                        }));
                        setIsDirty(true);
                      }}
                      className="bg-transparent text-white text-xs font-semibold outline-none flex-1 min-w-0"
                      placeholder="Titre de la photo..."
                      style={{ border: 'none' }}
                    />
                    <button
                      onClick={() => removePhoto(key)}
                      className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100"
                      style={{ color: '#FFFFFF' }}
                      title="Supprimer"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <div
                    className="p-3"
                    style={{ backgroundColor: '#F8F9FA' }}
                  >
                    {photo.base64 ? (
                      <div className="relative">
                        <img
                          src={`data:image/jpeg;base64,${photo.base64}`}
                          alt={photo.label}
                          className="w-full object-cover"
                          style={{ height: '140px', borderRadius: '3px' }}
                        />
                        <label
                          className="absolute bottom-2 right-2 flex items-center gap-1 text-xs px-2 py-1 cursor-pointer"
                          style={{
                            backgroundColor: 'rgba(0,0,0,0.55)',
                            color: '#FFFFFF',
                            borderRadius: '3px',
                          }}
                        >
                          <Upload size={10} />
                          Remplacer
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handlePhotoUpload(key, file);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <label
                        className="flex flex-col items-center justify-center cursor-pointer transition-colors"
                        style={{
                          height: '140px',
                          border: '2px dashed #DEE2E6',
                          borderRadius: '3px',
                          backgroundColor: '#FFFFFF',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#C0392B';
                          e.currentTarget.style.backgroundColor = '#FDEDEC';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#DEE2E6';
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        <Camera
                          size={20}
                          style={{
                            color: '#ADB5BD',
                            marginBottom: '8px',
                          }}
                        />
                        <p
                          className="text-xs text-center"
                          style={{ color: '#ADB5BD' }}
                        >
                          Cliquer pour ajouter
                          <br />
                          une photo
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(key, file);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              ) : null,
            )}

          <div
            style={{
              border: '2px dashed #DEE2E6',
              borderRadius: '4px',
              overflow: 'hidden',
              cursor: 'pointer',
            }}
            onClick={() => {
              const key = `photo_${Date.now()}`;
              setPhotos(prev => ({
                ...prev,
                [key]: {
                  base64: '',
                  fileName: '',
                  label: 'Nouvel emplacement',
                },
              }));
              setIsDirty(true);
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#C0392B';
              e.currentTarget.style.backgroundColor = '#FDEDEC';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#DEE2E6';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
              <Plus size={24} style={{ color: '#ADB5BD' }} />
              <p
                className="text-xs font-medium"
                style={{ color: '#6C757D' }}
              >
                Ajouter un emplacement
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── TRAVAUX PAR POINTS CHAUDS ── */}
      {config.travauxPointsChauds &&
        config.travauxPointsChauds !== 'Jamais' && (
          <SectionCard title="7.10 — Travaux par points chauds">
            <p
              className="text-xs font-semibold mb-3 flex items-center"
              style={{ color: '#6C757D' }}
            >
              Travaux par points chauds <ReadonlyBadge />
            </p>

            <InfoRow
              label="Fréquence"
              value={val(config.travauxPointsChauds)}
            />
            <InfoRow
              label="Permis de travaux à chaud"
              value={bool(config.permisTravauxChauds)}
            />
            <InfoRow
              label="Surveillance incendie"
              value={bool(config.surveillanceIncendieTPC)}
            />
            <InfoRow
              label="Responsable désigné"
              value={val(config.responsableTravauxChauds)}
            />
            <InfoRow
              label="Inspection finale documentée"
              value={bool(config.inspectionFinaleDocumentee)}
            />
            <InfoRow
              label="Méthode d'inspection finale"
              value={val(config.methodeInspectionTPC)}
            />
            <InfoRow
              label="Travaux sur toiture possibles"
              value={bool(config.travauxToiture)}
            />
          </SectionCard>
        )}

      {/* ── LABORATOIRES ── */}
      {config.laboratoirePresent && (
        <SectionCard title="7.11 — Laboratoires">
          <p
            className="text-xs font-semibold mb-3 flex items-center"
            style={{ color: '#6C757D' }}
          >
            Laboratoires <ReadonlyBadge />
          </p>

          <InfoRow
            label="Laboratoire présent"
            value={bool(config.laboratoirePresent)}
          />
          <InfoRow
            label="Type(s) de laboratoire"
            value={listVal(config.typeLaboratoire)}
          />
          <InfoRow
            label="Gaz comprimés présents"
            value={bool(config.gazComprimesPresents)}
          />
          {config.gazComprimesPresents && (
            <InfoRow
              label="Armoire / cabinet ventilé"
              value={bool(config.armireCabinetVentile)}
            />
          )}
          <InfoRow
            label="Gaz toxiques présents"
            value={bool(config.gazToxiquesPresents)}
          />
          <InfoRow
            label="Détection de gaz au laboratoire"
            value={bool(config.detectionGazLabo)}
          />
          <InfoRow
            label="Panneaux TMD à l'entrée"
            value={bool(config.panneauxTMDLabo)}
          />
        </SectionCard>
      )}

      {/* ── SECTIONS INDUSTRIELLES ── */}
      {isIndustriel && (
        <>
          <SectionCard title="7.12 — Installations industrielles">
            <p
              className="text-xs font-semibold mb-3 flex items-center"
              style={{ color: '#6C757D' }}
            >
              Installations industrielles <ReadonlyBadge />
            </p>

            <SubHeading>Espaces clos</SubHeading>
            <InfoRow
              label="Espaces clos présents"
              value={bool(config.espaceClos)}
            />
            {config.espaceClos && (
              <InfoRow
                label="Localisation"
                value={val(config.espaceClosLieu)}
              />
            )}

            <SubHeading>Palettiers</SubHeading>
            <InfoRow
              label="Palettiers présents"
              value={bool(config.palettierPresent)}
            />
            {config.palettierPresent && (
              <>
                <InfoRow
                  label="Agencement"
                  value={val(config.palettierAgencement)}
                />
                <InfoRow
                  label="Gicleurs dans les palettiers"
                  value={bool(config.palettierGicleurs)}
                />
                <InfoRow
                  label="Allées"
                  value={val(config.palettierAlles)}
                />
              </>
            )}

            <SubHeading>Stockage</SubHeading>
            <InfoRow
              label="Stockage présent"
              value={bool(config.stockagePresent)}
            />
            {config.stockagePresent && (
              <>
                <InfoRow
                  label="Palettes"
                  value={val(config.stockagePalettes)}
                />
                <InfoRow
                  label="Palettes combustibles"
                  value={bool(config.stockagePalettesCombustible)}
                />
                <InfoRow
                  label="Emplacement"
                  value={val(config.stockageEmplacement)}
                />
                <InfoRow
                  label="Hauteur de stockage"
                  value={val(config.stockageHauteur)}
                />
                <InfoRow
                  label="Largeur des allées"
                  value={val(config.stockageLargeurAllee)}
                />
                <InfoRow
                  label="Classification"
                  value={val(config.stockageClassification)}
                />
              </>
            )}

            <SubHeading>Mezzanine</SubHeading>
            <InfoRow
              label="Mezzanine présente"
              value={bool(config.mezzaninePresent)}
            />
            {config.mezzaninePresent && (
              <>
                <InfoRow
                  label="Giclée"
                  value={bool(config.mezzanineGicle)}
                />
                <InfoRow
                  label="Encloisonnée"
                  value={bool(config.mezzanineEncloisonnee)}
                />
                <InfoRow
                  label="Localisation"
                  value={val(config.mezzanineLieu)}
                />
              </>
            )}

            <SubHeading>Chariots élévateurs</SubHeading>
            <InfoRow
              label="Chariots présents"
              value={bool(config.chariotsPresent)}
            />
            {config.chariotsPresent && (
              <>
                <InfoRow
                  label="Nombre"
                  value={val(config.chariotsNombre)}
                />
                <InfoRow
                  label="Type"
                  value={val(config.chariotsType)}
                />
                <InfoRow
                  label="Emplacement de recharge"
                  value={val(config.chariotsEmplacementRecharge)}
                />
              </>
            )}

            <SubHeading>Batteries lithium-ion</SubHeading>
            <InfoRow
              label="Batteries lithium présentes"
              value={bool(config.batteriesLithiumPresent)}
            />
            {config.batteriesLithiumPresent && (
              <>
                <InfoRow
                  label="Local / espace dédié"
                  value={bool(config.batteriesLithiumLocalEspace)}
                />
                {config.batteriesLithiumLocalEspaceCommentaire && (
                  <InfoRow
                    label="Commentaire — local / espace"
                    value={val(
                      config.batteriesLithiumLocalEspaceCommentaire,
                    )}
                  />
                )}
                <InfoRow
                  label="Détection dédiée"
                  value={bool(config.batteriesLithiumDetection)}
                />
                {config.batteriesLithiumDetectionCommentaire && (
                  <InfoRow
                    label="Commentaire — détection"
                    value={val(
                      config.batteriesLithiumDetectionCommentaire,
                    )}
                  />
                )}
                <InfoRow
                  label="Signalisation"
                  value={bool(config.batteriesLithiumSignalisation)}
                />
                {config.batteriesLithiumSignalisationCommentaire && (
                  <InfoRow
                    label="Commentaire — signalisation"
                    value={val(
                      config.batteriesLithiumSignalisationCommentaire,
                    )}
                  />
                )}
              </>
            )}
          </SectionCard>

          <SectionCard title="7.13 — Procédés dangereux">
            <p
              className="text-xs font-semibold mb-3 flex items-center"
              style={{ color: '#6C757D' }}
            >
              Procédés dangereux <ReadonlyBadge />
            </p>

            <InfoRow
              label="Procédés dangereux présents"
              value={bool(config.procesDangereux)}
            />

            {config.procesDangereux &&
              config.procesDangereuxDetails?.length > 0 && (
                <div className="overflow-x-auto mt-3">
                  <table
                    className="w-full text-sm min-w-[760px]"
                    style={{ borderCollapse: 'collapse' }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: '#F8F9FA' }}>
                        {[
                          'Procédure',
                          'Type',
                          'Risque',
                          'Mesures',
                        ].map(header => (
                          <th
                            key={header}
                            className="text-left px-3 py-2 text-xs font-semibold"
                            style={{
                              color: '#495057',
                              border: '1px solid #E9ECEF',
                            }}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {config.procesDangereuxDetails.map(
                        (item: any, idx: number) => (
                          <tr key={idx}>
                            <td
                              className="px-3 py-2 text-xs"
                              style={{
                                border: '1px solid #E9ECEF',
                                color: '#2C3E50',
                              }}
                            >
                              {val(item.procedure)}
                            </td>
                            <td
                              className="px-3 py-2 text-xs"
                              style={{
                                border: '1px solid #E9ECEF',
                                color: '#2C3E50',
                              }}
                            >
                              {val(item.type)}
                            </td>
                            <td
                              className="px-3 py-2 text-xs"
                              style={{
                                border: '1px solid #E9ECEF',
                                color: '#2C3E50',
                              }}
                            >
                              {val(item.risque)}
                            </td>
                            <td
                              className="px-3 py-2 text-xs"
                              style={{
                                border: '1px solid #E9ECEF',
                                color: '#2C3E50',
                              }}
                            >
                              {val(item.mesures)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            <InfoRow
              label="Système de cadenassage"
              value={bool(config.systemeCadenassage)}
            />
          </SectionCard>
        </>
      )}
    </div>
  );
}
