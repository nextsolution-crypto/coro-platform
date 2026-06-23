'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { Settings, Camera, Upload, X, Check, ExternalLink, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SpellCheckedTextarea from './SpellCheckedTextarea';

// ============================================================
// TYPES
// ============================================================

interface Module7SectionProps {
  projectId: string;
  language?: 'fr' | 'en';
}

interface QuartsData {
  jour:  { semaine: string; samedi: string; dimanche: string };
  soir:  { semaine: string; samedi: string; dimanche: string };
  nuit:  { semaine: string; samedi: string; dimanche: string };
  infosSup: string;
}

interface PhotoEntry {
  base64: string;
  fileName: string;
  label: string;
}

type PhotosData = Record<string, PhotoEntry | null>;

const DEFAULT_PHOTO_SLOTS = [
  { key: '01_entree_principale',    label: 'Entrée principale / Poste de commandement' },
  { key: '02_point_rassemblement',  label: 'Point de rassemblement' },
  { key: '03_plan_mesures',         label: 'Plan de mesures d\'urgence' },
  { key: '04_boite_cles',           label: 'Boîte à clés' },
  { key: '05_ascenseur',            label: 'Ascenseur' },
  { key: '06_escalier_urgence',     label: 'Escalier d\'urgence' },
  { key: '07_acces_toit',           label: 'Accès au toit' },
  { key: '08_separation_coupe_feu', label: 'Séparation coupe-feu' },
  { key: '09_chute_ordures',        label: 'Chute à ordures' },
  { key: '10_chauffage',            label: 'Chauffage' },
  { key: '11_ventilation',          label: 'Ventilation' },
  { key: '12_salle_electrique',     label: 'Salle électrique principale' },
];

// ============================================================
// HELPERS
// ============================================================

const val = (v: any, fallback = '—') =>
  v !== undefined && v !== null && v !== '' && v !== false && v !== 0
    ? String(v) : fallback;

const bool = (v: any) => v === true ? 'Oui' : v === false ? 'Non' : '—';

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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E9ECEF',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
      <div className="px-5 py-3"
        style={{ backgroundColor: '#C0392B' }}>
        <h3 className="font-bold text-sm text-white uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start py-2"
      style={{ borderBottom: '1px solid #F8F9FA' }}>
      <span className="text-sm font-medium w-56 flex-shrink-0" style={{ color: '#495057' }}>
        {label}
      </span>
      <span className="text-sm flex-1" style={{ color: value === '—' ? '#ADB5BD' : '#2C3E50' }}>
        {value}
      </span>
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-8">{children}</div>;
}

function ReadonlyBadge() {
  return (
    <span className="text-xs px-2 py-0.5 ml-2 font-medium"
      style={{
        backgroundColor: '#EBF5FB',
        color: '#2980B9',
        border: '1px solid #AED6F1',
        borderRadius: '3px',
      }}>
      Configurateur
    </span>
  );
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

export default function Module7Section({ projectId, language = 'fr' }: Module7SectionProps) {
  const isFr = language === 'fr';
  const router = useRouter();
  const isFirstLoad = useRef(true);

  const [config, setConfig]   = useState<any>({});
  const [quarts, setQuarts]   = useState<QuartsData>({
    jour:  { semaine: '', samedi: '', dimanche: '' },
    soir:  { semaine: '', samedi: '', dimanche: '' },
    nuit:  { semaine: '', samedi: '', dimanche: '' },
    infosSup: '',
  });
  const [photos, setPhotos]   = useState<PhotosData>({});
  const [extra, setExtra]     = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
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
        setConfig(configRes.data);
        if (dataRes.data.quartsData && Object.keys(dataRes.data.quartsData).length > 0) {
          setQuarts(dataRes.data.quartsData);
        }
        if (dataRes.data.photosData && Object.keys(dataRes.data.photosData).length > 0) {
  setPhotos(dataRes.data.photosData);
} else {
  const defaultPhotos: PhotosData = {};
  DEFAULT_PHOTO_SLOTS.forEach(slot => {
    defaultPhotos[slot.key] = { base64: '', fileName: '', label: slot.label };
  });
  setPhotos(defaultPhotos);
}
        if (dataRes.data.extraData)  setExtra(dataRes.data.extraData);
      } catch (err) { console.error(err); }
      finally {
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
        extraData:  extra,
      });
      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }, [projectId, quarts, photos, extra]);

  useEffect(() => {
    if (isFirstLoad.current || !isDirty) return;
    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [quarts, photos, extra, isDirty]);

  const updateQuart = (period: 'jour' | 'soir' | 'nuit', day: string, value: string) => {
    setQuarts(prev => ({ ...prev, [period]: { ...prev[period], [day]: value } }));
    setIsDirty(true);
  };

  // ── Upload photo ──────────────────────────────────────────
  const handlePhotoUpload = (key: string, file: File) => {
    if (!file.type.startsWith('image/')) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Redimensionne à une largeur max de 1000px pour limiter la taille du PDF
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

      // Compresse en JPEG qualité 80%
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const base64 = compressedDataUrl.split(',')[1];

      setPhotos(prev => ({
        ...prev,
        [key]: { base64, fileName: file.name, label: key },
      }));
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

  if (loading) return (
    <div className="max-w-4xl mx-auto px-6 py-16 flex items-center justify-center">
      <span className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</span>
    </div>
  );

  const isIndustriel = config.buildingType === 'Industriel' ||
    config.usagePrincipal?.startsWith('F');

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">

      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#ADB5BD' }}>
            Module 7
          </p>
          <h1 className="text-3xl font-black uppercase leading-tight" style={{ color: '#2C3E50' }}>
            DESCRIPTION DU SITE
          </h1>
          <h2 className="text-xl font-black uppercase leading-tight" style={{ color: '#6C757D' }}>
            ET ÉQUIPEMENTS DE SÉCURITÉ
          </h2>
          <div className="h-1 w-16 mt-2" style={{ backgroundColor: '#C0392B' }} />
        </div>

        <div className="flex items-center gap-3">
          {/* Autosave */}
          <div className="text-xs">
            {saving && (
              <span className="flex items-center gap-1.5" style={{ color: '#2980B9' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#2980B9' }} />
                Sauvegarde...
              </span>
            )}
            {!saving && lastSaved && !isDirty && (
              <span className="flex items-center gap-1.5" style={{ color: '#27AE60' }}>
                <Check size={12} />
                Sauvegardé {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          {/* Lien configurateur */}
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
      <div className="flex items-center gap-2 px-4 py-3 mb-6"
        style={{
          backgroundColor: '#EBF5FB',
          border: '1px solid #AED6F1',
          borderRadius: '4px',
        }}>
        <span style={{ color: '#2980B9', fontSize: '13px' }}>ℹ</span>
        <p className="text-xs" style={{ color: '#2980B9' }}>
          Les données marquées <strong>Configurateur</strong> proviennent de la configuration du projet.
          Pour les modifier, retournez au configurateur. Les photos et quarts de travail sont éditables directement ici.
        </p>
      </div>

      {/* ── 7.1 DESCRIPTION GÉNÉRALE ── */}
      <SectionCard title="7.1 — Description générale">
        <p className="text-xs font-semibold mb-3 flex items-center"
          style={{ color: '#6C757D' }}>
          Informations sur le bâtiment <ReadonlyBadge />
        </p>
        <InfoRow label="Usage principal" value={val(config.usagePrincipal)} />
        <InfoRow label="Usage secondaire" value={val(config.usageSecondaire)} />
        <div className="grid grid-cols-3 gap-4 py-2" style={{ borderBottom: '1px solid #F8F9FA' }}>
          <div>
            <p className="text-xs" style={{ color: '#ADB5BD' }}>Nombre de sous-sols</p>
            <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{val(config.basements, '0')}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#ADB5BD' }}>Nombre d'étages</p>
            <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{val(config.floors, '0')}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: '#ADB5BD' }}>Grande hauteur (+18m)</p>
            <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{bool(config.hauteurBatiment)}</p>
          </div>
        </div>
        <InfoRow label="Accès" value={val(config.typeConstruction)} />
        <InfoRow label="Construction du bâtiment" value={val(config.typeConstruction)} />
        <InfoRow label="Année de construction" value={val(config.anneeConstruction)} />
        <InfoRow label="Dernière rénovation majeure" value={val(config.derniereRenovation)} />
        <InfoRow label="Superficie (pi²)" value={val(config.superficie)} />
        <InfoRow label="Bâtiment à grande hauteur" value={bool(config.hauteurBatiment)} />
        <InfoRow label="Toit végétal" value="N/A" />

        <div className="mt-4">
          <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
            Emplacements <ReadonlyBadge />
          </p>
          <InfoRow label="Poste de commandement" value={val(config.posteCommandement)} />
          <InfoRow label="Point de rassemblement" value={val(config.pointRassemblement)} />
          <InfoRow label="Plan de mesures d'urgence" value="—" />
          <InfoRow label="Trousseau de clés pompier" value={bool(config.trousseClesPompier)} />
        </div>

        {/* Quarts de travail — LECTURE SEULE (configurateur) */}
        <div className="mt-4">
          <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
            Occupation des lieux <ReadonlyBadge />
          </p>
          {config.quartsOccupation?.length > 0 ? (
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  <th className="text-left px-3 py-2 text-xs font-semibold" style={{ color: '#495057', border: '1px solid #E9ECEF' }}>
                    Quart de travail
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold" style={{ color: '#495057', border: '1px solid #E9ECEF' }}>
                    Semaine
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold" style={{ color: '#495057', border: '1px solid #E9ECEF' }}>
                    Samedi
                  </th>
                  <th className="text-center px-3 py-2 text-xs font-semibold" style={{ color: '#495057', border: '1px solid #E9ECEF' }}>
                    Dimanche
                  </th>
                </tr>
              </thead>
              <tbody>
                {config.quartsOccupation.map((q: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 text-xs font-medium" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>
                      {q.nomQuart} ({q.heureDebut} – {q.heureFin})
                    </td>
                    <td className="px-3 py-2 text-xs text-center" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                      {q.occupantsSemaine || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-center" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                      {q.occupantsSamedi || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-center" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>
                      {q.occupantsDimanche || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun quart de travail déclaré</p>
          )}
          <div className="mt-3">
            <label className="text-xs font-medium mb-1 block" style={{ color: '#495057' }}>
              Informations supplémentaires
            </label>
            <SpellCheckedTextarea
              value={quarts.infosSup}
              onChange={val => { setQuarts(prev => ({ ...prev, infosSup: val })); setIsDirty(true); }}
              placeholder="Informations supplémentaires sur l'occupation..."
              rows={2}
              language="fr"
              style={{ ...inputStyle, resize: 'none', width: '100%' }}
            />
          </div>
        </div>
      </SectionCard>

      {/* ── 7.2 MÉCANIQUE DU BÂTIMENT ── */}
      <SectionCard title="7.2 — Mécanique du bâtiment">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Mécanique du bâtiment <ReadonlyBadge />
        </p>

        {/* Ascenseurs */}
        <p className="text-xs font-bold mb-2 mt-2 uppercase tracking-wide" style={{ color: '#C0392B' }}>Ascenseurs</p>
        <InfoRow label="Type" value={val(config.typeAscenseur)} />
        <InfoRow label="Emplacement salle mécanique" value={val(config.salleAscenseur)} />
        <InfoRow label="Rappel d'ascenseurs" value={val(config.rappelAscenseursLieu)} />
        <InfoRow label="Ascenseur pompier" value={bool(config.ascenseurPompier)} />
        <InfoRow label="Fonctionne sur alimentation de secours" value={bool(config.fonctionneSecours)} />
        <InfoRow label="Téléphone dans tous les ascenseurs" value={bool(config.telephoneAscenseurs)} />

        {/* Escaliers */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Escaliers</p>
        <InfoRow label="Escaliers pressurisés" value={bool(config.escaliersPressurises)} />
        <InfoRow label="Nombre d'escaliers" value={val(config.nbEscaliers)} />

        {/* Toit */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Toit</p>
        <InfoRow label="Toit verrouillé" value={bool(config.toitVerrouille)} />
        <InfoRow label="Accès au toit" value={val(config.accesToit)} />

        {/* Séparation coupe-feu */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Séparation coupe-feu</p>
        <InfoRow label="Présence" value={bool(config.separationCoupeFeu)} />
        <InfoRow label="Emplacement" value={val(config.separationCoupeFeuLieu)} />

        {/* Déchets (industriel) */}
        {isIndustriel && (
          <>
            <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Déchets</p>
            <InfoRow label="Compacteur" value="—" />
            <InfoRow label="Présence de gicleurs" value={bool(config.gicleurs)} />
          </>
        )}

        {/* CVAC */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>CVAC</p>
        <InfoRow label="Emplacement" value={val(config.cvacLocalisation)} />
        <InfoRow label="Type de chauffage" value={val(config.typeChautfage)} />
        <InfoRow label="Type de refroidissement" value={val(config.typeRefroidissement)} />
        <InfoRow label="Désenfumage" value={bool(config.desenfumage)} />
        <InfoRow label="Emplacement désenfumage" value={val(config.desenfumageLieu)} />

        {/* Gaz naturel */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Gaz naturel</p>
        <InfoRow label="Présent" value={bool(config.gazNaturel)} />
        <InfoRow label="Localisation entrée de gaz" value={val(config.gazNaturelLieu)} />

        {/* Salle électrique */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Salle électrique principale et secondaire</p>
        <InfoRow label="Emplacement" value={val(config.salleElectrique)} />

        {/* Alimentation de secours */}
        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Alimentation de secours / Éclairage d'urgence</p>
        <InfoRow label="Génératrice présente" value={bool(config.generatrice)} />
        <InfoRow label="Emplacement génératrice" value={val(config.generatriceLieu)} />
        <InfoRow label="Type d'alimentation" value={val(config.generatriceCarburant)} />
        <InfoRow label="Autonomie" value={config.autonomieGeneratrice ? `${config.autonomieGeneratrice}h` : '—'} />
        <InfoRow label="Capacité réservoir" value={config.capaciteReservoir ? `${config.capaciteReservoir}L` : '—'} />
        {config.generatriceEquipements?.length > 0 && (
          <div className="py-2" style={{ borderBottom: '1px solid #F8F9FA' }}>
            <p className="text-sm font-medium mb-2" style={{ color: '#495057' }}>Équipements sur alimentation de secours</p>
            <div className="flex flex-wrap gap-2">
              {config.generatriceEquipements.map((eq: string) => (
                <span key={eq} className="text-xs px-2 py-1"
                  style={{
                    backgroundColor: '#EAFAF1',
                    color: '#27AE60',
                    border: '1px solid #A9DFBF',
                    borderRadius: '3px',
                  }}>
                  {eq}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Monte-charge (industriel) */}
        {isIndustriel && (
          <>
            <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Monte-charge</p>
            <InfoRow label="Type" value="—" />
            <InfoRow label="Emplacement salle mécanique" value="—" />
            <InfoRow label="Fonctionne sur alimentation de secours" value="—" />
          </>
        )}
      </SectionCard>

      {/* ── 7.3 RÉSEAU D'ALARME INCENDIE ── */}
      <SectionCard title="7.3 — Réseau d'alarme incendie">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Alarme incendie <ReadonlyBadge />
        </p>
        <InfoRow label="Présence et localisation du panneau" value={val(config.panneauLocalisation)} />
        <InfoRow label="Marque / Modèle" value={`${val(config.panneauMarque, '')} ${val(config.panneauModele, '')}`.trim() || '—'} />
        <InfoRow label="Type" value={val(config.panneauType)} />
        <InfoRow label="Panneau annonciateur" value={bool(config.panneauAnnonciateurDistance)} />
        <InfoRow label="Emplacement annonciateur" value={val(config.panneauAnnonciateurLieu)} />
        <InfoRow label="Téléphone pompier" value={bool(config.telephonePompier)} />
        <InfoRow label="Type de signal" value={val(config.panneauType)} />
        <InfoRow label="Heures de fonctionnement (double)" value={val(config.heuresFonctionnement)} />
        <InfoRow label="Communication phonique" value={bool(config.systemePhonic)} />

        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Relais auxiliaires</p>
        {[
          { label: 'Appel à la centrale d\'alarme', key: 'teleSurveillance' },
          { label: 'Arrêt de la ventilation', key: 'arretVentilation' },
          { label: 'Rappel des ascenseurs', key: 'rappelAscenseurs' },
          { label: 'Système de désenfumage', key: 'desenfumageAutomatique' },
          { label: 'Déverrouillage des zones à accès contrôlé', key: 'deverrouillagePorces' },
          { label: 'Fermeture des portes coupe-feu', key: 'fermeturePortesCoupeFeu' },
        ].map(item => (
          <div key={item.key} className="flex items-center gap-2 py-1.5"
            style={{ borderBottom: '1px solid #F8F9FA' }}>
            <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: config[item.key] ? '#C0392B' : '#FFFFFF',
                borderColor: config[item.key] ? '#C0392B' : '#CED4DA',
              }}>
              {config[item.key] && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-sm" style={{ color: '#495057' }}>{item.label}</span>
          </div>
        ))}

        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Éléments de détection</p>
        {[
          { label: 'Station manuelle d\'alarme incendie', key: 'stationManuelle' },
          { label: 'Détecteur de chaleur', key: 'detecteurChaleur' },
          { label: 'Détecteur de fumée', key: 'detecteurFumee' },
          { label: 'Détecteur de débit de gicleurs', key: 'detecteurDebitGicleurs' },
        ].map(item => (
          <div key={item.key} className="flex items-center gap-2 py-1.5"
            style={{ borderBottom: '1px solid #F8F9FA' }}>
            <div className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: config[item.key] ? '#C0392B' : '#FFFFFF',
                borderColor: config[item.key] ? '#C0392B' : '#CED4DA',
              }}>
              {config[item.key] && <span className="text-white text-xs">✓</span>}
            </div>
            <span className="text-sm" style={{ color: '#495057' }}>{item.label}</span>
          </div>
        ))}
      </SectionCard>

      {/* ── 7.4 SYSTÈME DE GICLEURS ── */}
      <SectionCard title="7.4 — Système de gicleurs et protection incendie">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Système d'extinction incendie <ReadonlyBadge />
        </p>
        <InfoRow label="Réseau de gicleurs" value={bool(config.gicleurs)} />
        <InfoRow label="Localisation salle des gicleurs" value={val(config.salleGicleurs)} />
        <InfoRow label="Vannes d'isolement de zone" value={bool(config.vannesIsolement)} />
        <InfoRow label="Emplacement vannes" value={val(config.vannesIsolementLieu)} />

        <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>Équipements</p>
        <InfoRow label="Prise de refoulement" value={bool(config.priseRefoulement)} />
        <InfoRow label="Pompe incendie" value={bool(config.pompeIncendie)} />
        <InfoRow label="GAPM/USGPM" value={val(config.gapmUsgpm)} />
        <InfoRow label="Système spécial d'extinction" value={bool(config.systemeExtinctionFixe)} />
        <InfoRow label="Boyau incendie / Cabinet" value={bool(config.boyauIncendie)} />
        <InfoRow label="Raccord pompier" value={bool(config.raccordPompier)} />
        <InfoRow label="Emplacement raccord" value={val(config.raccordPompierLieu)} />
        <InfoRow label="Borne-fontaine" value={bool(config.bornesFontaine)} />
        <InfoRow label="Emplacement borne-fontaine" value={val(config.bornesFontaineLieu)} />
      </SectionCard>

      {/* ── 7.5 MATIÈRES DANGEREUSES ── */}
      <SectionCard title="7.5 — Matières dangereuses">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Matières dangereuses <ReadonlyBadge />
        </p>
        {config.matieresList?.length > 0 ? (
          <table className="w-full text-sm mb-4" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#C0392B' }}>
                {['Nom du produit', 'Numéro UN', 'Quantité et emplacement', 'TMD', 'SIMDUT'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-white"
                    style={{ border: '1px solid #A93226' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.matieresList.map((m: any, idx: number) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F8F9FA' }}>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>{m.nom || '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>{m.numeroUN || '—'}</td>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>{m.quantiteEmplacement || '—'}</td>
                  <td className="px-3 py-2 text-xs text-center" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>{m.tmd ? '✓' : '—'}</td>
                  <td className="px-3 py-2 text-xs text-center" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>{m.simdut ? '✓' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm mb-4" style={{ color: '#ADB5BD' }}>Aucune matière dangereuse déclarée</p>
        )}
        <InfoRow label="Trousse de déversement présente" value={bool(config.trousseDeversement)} />
        <InfoRow label="Emplacement trousse" value={val(config.trousseDeversementLieu)} />
      </SectionCard>

      {/* ── 7.6 EXTINCTEUR PORTATIF ── */}
      <SectionCard title="7.6 — Extincteur portatif">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Extincteur portatif <ReadonlyBadge />
        </p>
        <div className="p-4 mb-4"
          style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF', borderRadius: '4px' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#495057' }}>Utilisation :</p>
          <ol className="text-xs space-y-1" style={{ color: '#495057', paddingLeft: '16px', listStyle: 'decimal' }}>
            {[
              'Alerte : Prévenez immédiatement les occupants à proximité.',
              'Avertisseur : Activez la station manuelle d\'alarme incendie la plus proche.',
              'Sécurité personnelle : Assurez-vous que votre sécurité n\'est pas en danger.',
              'Préparation : Retirez l\'extincteur de son support.',
              'Positionnement : Placez-vous entre le feu et une sortie pour assurer une voie de fuite.',
              'Approche : Avancez à une distance de 2-3 mètres (6-10 pieds) du feu.',
              'Activation : Retirez la goupille en la tournant et en la tirant pour briser le scellé.',
              'Ciblage : Tenez le boyau (si présent) et dirigez-le vers la base des flammes.',
              'Extinction : Appuyez sur le levier et faites des mouvements de balayage de va et vient à la base des flammes, couvrant toute la largeur du feu.',
              'Départ : Déposez l\'extincteur au bas du mur et évacuez par la sortie la plus proche.',
              'Point de rassemblement : Rejoignez le point de rassemblement extérieur pour un comptage sécuritaire.',
            ].map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
        {config.extincteursList?.length > 0 ? (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#495057' }}>
              Types d'extincteurs présents :
            </p>
            {config.extincteursList.map((ex: any, idx: number) => (
              <div key={idx} className="flex items-center gap-3 py-1.5"
                style={{ borderBottom: '1px solid #F8F9FA' }}>
                <span className="text-xs font-medium" style={{ color: '#2C3E50' }}>{ex.type}</span>
                <span style={{ color: '#DEE2E6' }}>—</span>
                <span className="text-xs" style={{ color: '#6C757D' }}>{ex.lieu || '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun extincteur déclaré</p>
        )}
      </SectionCard>

      {/* ── 7.7 ÉQUIPEMENTS DE PREMIERS SOINS ── */}
      <SectionCard title="7.7 — Équipements de premiers soins">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Équipements disponibles sur le site <ReadonlyBadge />
        </p>
        {config.equipementsSoins?.length > 0 ? (
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA' }}>
                {['Équipement', 'Disponible', 'Emplacement'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-semibold"
                    style={{ color: '#495057', border: '1px solid #E9ECEF' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.equipementsSoins.map((eq: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #E9ECEF', color: '#2C3E50' }}>{eq.type}</td>
                  <td className="px-3 py-2 text-xs text-center" style={{ border: '1px solid #E9ECEF', color: '#27AE60' }}>✓</td>
                  <td className="px-3 py-2 text-xs" style={{ border: '1px solid #E9ECEF', color: '#6C757D' }}>{eq.lieu || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun équipement déclaré</p>
        )}
      </SectionCard>

      {/* ── 7.8 DÉTECTEURS DE GAZ ── */}
      <SectionCard title="7.8 — Détecteurs de gaz">
        <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
          Détecteurs de gaz <ReadonlyBadge />
        </p>
        {[
          {
            label: '7.8.1 Détecteur de monoxyde de carbone (CO)',
            present: config.detecteurCO,
            seuil1: config.detecteurCOSeuil1 ? `${config.detecteurCOSeuil1} ppm` : '25 ppm',
            seuil2: config.detecteurCOSeuil2 ? `${config.detecteurCOSeuil2} ppm` : '150 ppm',
            lieu: config.detecteurCOLieu,
          },
          {
            label: '7.8.2 Détecteur de gaz naturel — Méthane (CH₄)',
            present: config.detecteurGazNaturel,
            seuil1: '5 000 ppm',
            seuil2: '72 000 ppm',
            lieu: config.detecteurGazNaturelLieu,
          },
          ...(isIndustriel ? [
            {
              label: '7.8.3 Détecteur de propane (C3H8)',
              present: config.detecteurPropane,
              seuil1: '23 000 ppm',
              seuil2: 'xxx ppm',
              lieu: '—',
            },
            {
              label: '7.8.4 Détecteur d\'ammoniac (NH₃)',
              present: config.detecteurAmmoniac,
              seuil1: config.detecteurAmmoniacSeuil1 ? `${config.detecteurAmmoniacSeuil1} ppm` : '25 ppm',
              seuil2: config.detecteurAmmoniacSeuil2 ? `${config.detecteurAmmoniacSeuil2} ppm` : '35 ppm',
              lieu: '—',
            },
            {
              label: '7.8.5 Détecteur de fréon (NCHC)',
              present: config.detecteurFreon,
              seuil1: '250 ppm',
              seuil2: '500 ppm',
              lieu: '—',
            },
            {
              label: '7.8.6 Détecteur d\'oxygène (O₂)',
              present: config.detecteurO2,
              seuil1: '19.5%',
              seuil2: '20%',
              lieu: '—',
            },
            {
              label: '7.8.7 Détecteur FM200 — Heptafluoropropane (C₃HF₇)',
              present: config.detecteurFM200,
              seuil1: '—',
              seuil2: '—',
              lieu: '—',
            },
          ] : []),
        ].filter(d => d.present).map((detector, idx) => (
          <div key={idx} className="mb-4">
            <p className="text-xs font-bold mb-2" style={{ color: '#495057' }}>{detector.label}</p>
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F9FA' }}>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#495057', border: '1px solid #E9ECEF', width: '50%' }}>
                    Élément / Information
                  </th>
                  <th className="text-left px-3 py-2 font-semibold" style={{ color: '#495057', border: '1px solid #E9ECEF' }}>
                    Description / Détails
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>Seuil d'activation d'alarme minimal</td>
                  <td className="px-3 py-2 font-medium" style={{ border: '1px solid #E9ECEF', color: '#C0392B' }}>{detector.seuil1}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>Seuil d'activation d'alarme maximal</td>
                  <td className="px-3 py-2 font-medium" style={{ border: '1px solid #E9ECEF', color: '#C0392B' }}>{detector.seuil2}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2" style={{ border: '1px solid #E9ECEF', color: '#495057' }}>Emplacement</td>
                  <td className="px-3 py-2" style={{ border: '1px solid #E9ECEF', color: '#6C757D' }}>{detector.lieu || '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
        {!config.detecteurCO && !config.detecteurGazNaturel && !config.detecteurAmmoniac && (
          <p className="text-sm" style={{ color: '#ADB5BD' }}>Aucun détecteur de gaz déclaré</p>
        )}
      </SectionCard>

      {/* ── 7.9 PHOTOS DES ÉQUIPEMENTS ── */}
<SectionCard title="7.9 — Photos des équipements de protection">
  <p className="text-xs font-semibold mb-4 flex items-center" style={{ color: '#6C757D' }}>
    Photos des équipements
    <span className="text-xs px-2 py-0.5 ml-2 font-medium"
      style={{
        backgroundColor: '#EAFAF1',
        color: '#27AE60',
        border: '1px solid #A9DFBF',
        borderRadius: '3px',
      }}>
      Éditable
    </span>
  </p>

  <div className="grid grid-cols-2 gap-4">
    {/* Cellules existantes */}
    {Object.entries(photos)
  .filter(([_, p]) => p !== null)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, photo]) => photo && (
        <div key={key}
          style={{
            border: '1px solid #E9ECEF',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
          {/* Header rouge avec titre éditable */}
          <div className="flex items-center justify-between px-3 py-2"
            style={{ backgroundColor: '#C0392B' }}>
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
              className="bg-transparent text-white text-xs font-semibold
                outline-none flex-1 min-w-0"
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

          {/* Zone photo */}
          <div className="p-3" style={{ backgroundColor: '#F8F9FA' }}>
            {photo.base64 ? (
              <div className="relative">
                <img
                  src={`data:image/jpeg;base64,${photo.base64}`}
                  alt={photo.label}
                  className="w-full object-cover"
                  style={{ height: '140px', borderRadius: '3px' }}
                />
                {/* Bouton remplacer */}
                <label
                  className="absolute bottom-2 right-2 flex items-center gap-1
                    text-xs px-2 py-1 cursor-pointer"
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
                className="flex flex-col items-center justify-center cursor-pointer
                  transition-colors"
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
                <Camera size={20} style={{ color: '#ADB5BD', marginBottom: '8px' }} />
                <p className="text-xs text-center" style={{ color: '#ADB5BD' }}>
                  Cliquer pour ajouter<br />une photo
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
      ))}

    {/* Cellule — Ajouter */}
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
          [key]: { base64: '', fileName: '', label: 'Nouvel emplacement' },
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
        <p className="text-xs font-medium" style={{ color: '#6C757D' }}>
          Ajouter un emplacement
        </p>
      </div>
    </div>
  </div>
</SectionCard>

      {/* ── SECTIONS INDUSTRIELLES ── */}
      {isIndustriel && (
        <>
          {/* 7.9 Entreposage et manutention */}
          <SectionCard title="7.9 — Entreposage et manutention">
            <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
              Entreposage et manutention <ReadonlyBadge />
            </p>

            <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: '#C0392B' }}>7.9.1 Palettier</p>
            <InfoRow label="Palettiers présents" value={bool(config.palettiers)} />

            <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>7.9.4 Chariot élévateur</p>
            <InfoRow label="Chariots élévateurs présents" value={bool(config.chariotsElevateurs)} />
            <InfoRow label="Chariots sur batterie" value={bool(config.chariotsElevateursBatterie)} />
            <InfoRow label="Zone de recharge" value={val(config.chariotsElevateursLieu)} />

            <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>7.9.5 Batteries lithium</p>
            <InfoRow label="Batteries lithium-ion présentes" value={bool(config.batteriesLithium)} />

            <p className="text-xs font-bold mb-2 mt-4 uppercase tracking-wide" style={{ color: '#C0392B' }}>7.9.3 Mezzanine</p>
            <InfoRow label="Mezzanine présente" value={bool(config.mezzanine)} />
            <InfoRow label="Localisation" value={val(config.mezzanineLieu)} />
          </SectionCard>

          {/* 7.10 Procédés dangereux */}
          <SectionCard title="7.10 — Procédés dangereux">
            <p className="text-xs font-semibold mb-3 flex items-center" style={{ color: '#6C757D' }}>
              Procédés dangereux <ReadonlyBadge />
            </p>
            <InfoRow label="Procédés dangereux présents" value={bool(config.procesDangereux)} />
            {config.procesDangereux && (
              <InfoRow label="Description" value={val(config.procesDangereuxDesc)} />
            )}
            <InfoRow label="Travaux à chaud effectués" value={bool(config.travailChaud)} />
            <InfoRow label="Espaces clos présents" value={bool(config.espaceClos)} />
            <InfoRow label="Localisation espaces clos" value={val(config.espaceClosLieu)} />
            <InfoRow label="Programme de cadenassage" value={bool(config.systemeCadenassage)} />
          </SectionCard>
        </>
      )}
    </div>
  );
}