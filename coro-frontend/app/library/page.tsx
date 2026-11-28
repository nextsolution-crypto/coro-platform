'use client';

import { useState, useEffect } from 'react';
import { activationLabel } from '@/lib/activationLabels';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';
import { confirmAction } from '@/lib/confirm-dialog';
import { toast } from '@/lib/toast';

interface IncidentCode {
  id: string;
  code: string;
  name: string;
  color: string;
  description?: string;
}

interface Role {
  id: string;
  roleCode: string;
  name: string;
  description?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const isManager = ['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');
  // Procédures personnalisées par l'organisation (codes) et versions enregistrées.
  const [orgVersionCodes, setOrgVersionCodes] = useState<Set<string>>(new Set());
  const [variants, setVariants] = useState<{
    id: string; code?: string; title?: string; name: string; ownerName?: string | null;
    isMine: boolean; sharedWithOrganization: boolean;
  }[]>([]);
  const [activeTab, setActiveTab] = useState<'codes' | 'roles' | 'procedures' | 'templates'>('codes');
  const [incidentCodes, setIncidentCodes] = useState<IncidentCode[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [templates, setTemplates] = useState<{
    id: string; name: string; description?: string | null; documentType: string; createdAt: string;
    createdById: string; createdBy?: { firstName: string; lastName: string } | null;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProc, setExpandedProc] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchData();
  }, [isAuthenticated]);

  const fetchData = async () => {
    let nextErrorsTemplates = '';
    setLoading(true);
    setErrors({});
    const [codesRes, rolesRes, proceduresRes, templatesRes] = await Promise.allSettled([
      api.get('/library/incident-codes'),
      api.get('/library/roles'),
      api.get('/library/procedures'),
      api.get('/templates'),
    ]);
    if (templatesRes.status === 'fulfilled') setTemplates(templatesRes.value.data || []);
    else nextErrorsTemplates = 'Impossible de charger les modèles de projet.';
    const nextErrors: Record<string, string> = {};
    if (nextErrorsTemplates) nextErrors.templates = nextErrorsTemplates;
    if (codesRes.status === 'fulfilled') setIncidentCodes(codesRes.value.data);
    else nextErrors.codes = 'Impossible de charger les codes incidents.';
    if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value.data);
    else nextErrors.roles = 'Impossible de charger les rôles.';
    if (proceduresRes.status === 'fulfilled') setProcedures(proceduresRes.value.data);
    else nextErrors.procedures = 'Impossible de charger les procédures.';
    loadVersions();
    setErrors(nextErrors);
    setLoading(false);
  };

  const loadVersions = async () => {
    const [orgRes, variantsRes] = await Promise.allSettled([
      api.get('/procedures/organization-versions'),
      api.get('/procedures/variants'),
    ]);
    if (orgRes.status === 'fulfilled')
      setOrgVersionCodes(new Set((orgRes.value.data || []).map((o: { code: string }) => o.code)));
    if (variantsRes.status === 'fulfilled') setVariants(variantsRes.value.data || []);
  };

  const variantAction = async (
    variant: { id: string; name: string },
    action: 'share' | 'unshare' | 'delete' | 'promote',
  ) => {
    const prompts = {
      share: { title: `Partager « ${variant.name} » ?`, message: 'Les conseillers de votre organisation pourront l’appliquer à leurs projets.', label: 'Partager' },
      unshare: { title: `Retirer le partage de « ${variant.name} » ?`, message: 'Elle redeviendra visible par son auteur seulement. Les projets où elle a été appliquée ne changent pas.', label: 'Retirer le partage' },
      delete: { title: `Supprimer « ${variant.name} » ?`, message: 'La version enregistrée sera supprimée définitivement. Les projets où elle a été appliquée ne changent pas.', label: 'Supprimer' },
      promote: { title: `Faire de « ${variant.name} » la version de l’organisation ?`, message: 'Tous les projets de l’organisation qui n’ont pas leur propre version utiliseront celle-ci.', label: 'Confirmer' },
    }[action];
    if (!(await confirmAction({ title: prompts.title, message: prompts.message, confirmLabel: prompts.label }))) return;
    try {
      if (action === 'delete') await api.delete(`/procedures/variants/${variant.id}`);
      else if (action === 'promote') await api.post(`/procedures/variants/${variant.id}/promote`);
      else await api.patch(`/procedures/variants/${variant.id}`, { sharedWithOrganization: action === 'share' });
      await loadVersions();
    } catch (err: unknown) {
      toast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action impossible.', 'error');
    }
  };

  const query = search.trim().toLocaleLowerCase('fr-CA');
  const visibleCodes = incidentCodes.filter((item) =>
    [item.code, item.name, item.description].some((value) => value?.toLocaleLowerCase('fr-CA').includes(query)),
  );
  const visibleRoles = roles.filter((item) =>
    [item.roleCode, item.name, item.description].some((value) => value?.toLocaleLowerCase('fr-CA').includes(query)),
  );
  const visibleProcedures = procedures.filter((item) =>
    [item.code, item.titleFR, item.titleEN].some((value: string | undefined) => value?.toLocaleLowerCase('fr-CA').includes(query)),
  );
  const visibleTemplates = templates.filter((item) =>
    [item.name, item.description ?? '', item.documentType].some((value) => value.toLocaleLowerCase('fr-CA').includes(query)),
  );
  const visibleCount = activeTab === 'codes'
    ? visibleCodes.length
    : activeTab === 'roles'
      ? visibleRoles.length
      : activeTab === 'templates'
        ? visibleTemplates.length
        : visibleProcedures.length;

  const deleteTemplate = async (template: { id: string; name: string }) => {
    const ok = await confirmAction({
      title: `Supprimer le modèle « ${template.name} » ?`,
      message: 'Le modèle sera supprimé définitivement. Les projets déjà créés à partir de ce modèle ne changent pas.',
      confirmLabel: 'Supprimer',
    });
    if (!ok) return;
    try {
      await api.delete(`/templates/${template.id}`);
      setTemplates(current => current.filter(item => item.id !== template.id));
      toast('Modèle supprimé.', 'success');
    } catch (err: any) {
      toast(err?.response?.data?.message || 'Impossible de supprimer ce modèle.', 'error');
    }
  };

  const getActivationLabel = (rule: string) => activationLabel(rule, 'fr');

  const tabs = [
    { key: 'codes',      label: 'Codes incidents', count: incidentCodes.length },
    { key: 'roles',      label: 'Rôles',           count: roles.length },
    { key: 'procedures', label: 'Procédures',       count: procedures.length },
    { key: 'templates',  label: 'Modèles de projet', count: templates.length },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>
          Bibliothèque centrale
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6C757D' }}>
          Codes incidents, rôles et procédures officielles CORO, et modèles de projet de votre organisation
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-0 mb-6" style={{ borderBottom: '1px solid #DEE2E6' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className="flex-1 sm:flex-none min-w-[120px] px-3 sm:px-5 py-2.5 text-xs sm:text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? '#C0392B' : '#6C757D',
              borderBottom: activeTab === tab.key ? '2px solid #C0392B' : '2px solid transparent',
              marginBottom: '-1px',
              backgroundColor: 'transparent',
            }}
          >
            {tab.label}
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: activeTab === tab.key ? '#FDEDEC' : '#F8F9FA',
                color: activeTab === tab.key ? '#C0392B' : '#ADB5BD',
              }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-5 max-w-xl">
        <label htmlFor="library-search" className="block text-sm font-medium mb-1" style={{ color: '#495057' }}>
          Rechercher dans la catégorie active
        </label>
        <input
          id="library-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Code, titre ou description"
          className="w-full rounded px-3 py-2 text-sm"
          style={{ border: '1px solid #CED4DA', backgroundColor: '#FFFFFF', color: '#2C3E50' }}
        />
      </div>

      {errors[activeTab] && (
        <div role="alert" className="mb-5 rounded p-4 flex flex-wrap items-center justify-between gap-3"
          style={{ backgroundColor: '#FDEDEC', border: '1px solid #F1948A', color: '#922B21' }}>
          <span>{errors[activeTab]}</span>
          <button type="button" onClick={fetchData} className="rounded px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #C0392B', color: '#C0392B' }}>
            Réessayer
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p>
        </div>
      ) : (
        <>
          {visibleCount === 0 && !errors[activeTab] && (
            <p role="status" className="rounded border px-4 py-8 text-center text-sm"
              style={{ borderColor: '#DEE2E6', backgroundColor: '#F8F9FA', color: '#6C757D' }}>
              Aucun résultat dans cette catégorie.
            </p>
          )}
          {/* ── CODES INCIDENTS ── */}
          {activeTab === 'codes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {visibleCodes.map(code => (
                <div key={code.id}
                  className="flex items-start gap-3 p-3 transition-colors min-w-0"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderLeft: `3px solid ${code.color}`,
                    borderRadius: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div className="w-7 h-7 rounded flex-shrink-0"
                    style={{ backgroundColor: code.color }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                      {code.name}
                    </p>
                    <p className="text-xs break-words" style={{ color: '#6C757D' }}>
                      {code.description}
                    </p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: '#ADB5BD' }}>
                      {code.code}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── RÔLES ── */}
          {activeTab === 'roles' && (
            <div className="grid gap-1.5">
              {visibleRoles.map(role => (
                <div key={role.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 transition-colors"
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                >
                  <div className="min-w-0 w-full sm:w-auto">
                    <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                      {role.name}
                    </p>
                    {role.description && (
                      <p className="text-xs mt-0.5 break-words" style={{ color: '#6C757D' }}>
                        {role.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-mono px-2 py-1 sm:ml-4 flex-shrink-0 self-start sm:self-auto whitespace-nowrap"
                    style={{
                      backgroundColor: '#F8F9FA',
                      color: '#495057',
                      border: '1px solid #DEE2E6',
                      borderRadius: '3px',
                    }}>
                    {role.roleCode}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── PROCÉDURES ── */}
          {activeTab === 'procedures' && variants.length > 0 && (
            <div className="mb-4 p-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: 6 }}>
              <p className="text-sm font-semibold" style={{ color: '#2C3E50' }}>Versions enregistrées</p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: '#6C757D' }}>
                Vos versions et celles partagées dans l’organisation. On les applique depuis l’éditeur d’une procédure, dans un projet.
              </p>
              <div className="space-y-1">
                {variants.map((variant) => (
                  <div key={variant.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 px-3 py-2 rounded"
                    style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold mr-2" style={{ color: '#ADB5BD' }}>{variant.code}</span>
                      <span className="text-sm" style={{ color: '#2C3E50' }}>{variant.name}</span>
                      <span className="text-xs ml-2" style={{ color: '#ADB5BD' }}>
                        {variant.isMine ? 'Ma version' : `par ${variant.ownerName || 'un collègue'}`}
                        {variant.sharedWithOrganization ? ' · partagée avec l’organisation' : ' · privée'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variant.isMine && !variant.sharedWithOrganization && (
                        <button type="button" onClick={() => variantAction(variant, 'share')} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF' }}>Partager avec l’organisation</button>
                      )}
                      {variant.sharedWithOrganization && (variant.isMine || isManager) && (
                        <button type="button" onClick={() => variantAction(variant, 'unshare')} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid #CED4DA', color: '#6C757D', backgroundColor: '#FFFFFF' }}>Retirer le partage</button>
                      )}
                      {isManager && variant.sharedWithOrganization && (
                        <button type="button" onClick={() => variantAction(variant, 'promote')} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid #AED6F1', color: '#2471A3', backgroundColor: '#FFFFFF' }}>Faire la version de l’organisation</button>
                      )}
                      {(variant.isMine || (isManager && variant.sharedWithOrganization)) && (
                        <button type="button" onClick={() => variantAction(variant, 'delete')} className="text-xs px-2 py-1 rounded"
                          style={{ border: '1px solid #F1948A', color: '#C0392B', backgroundColor: '#FFFFFF' }}>Supprimer</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'procedures' && (
            <div className="grid gap-1.5">
              {visibleProcedures.map(proc => (
                <div key={proc.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E9ECEF',
                    borderLeft: `3px solid ${proc.headerColor}`,
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>

                  {/* Ligne principale cliquable */}
                  <div
                    className="flex flex-col lg:flex-row lg:items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{ backgroundColor: '#FFFFFF' }}
                    onClick={() => setExpandedProc(expandedProc === proc.id ? null : proc.id)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FFFFFF'}
                  >
                    <div className="flex items-start gap-3 w-full lg:flex-1 min-w-0">
                      {/* Icône + couleur */}
                      <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-sm"
                        style={{ backgroundColor: proc.headerColor }}>
                        {proc.icon || '📋'}
                      </div>

                      {/* Code + titre */}
                      <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold"
                          style={{ color: '#ADB5BD' }}>
                          {proc.code}
                        </span>
                        {orgVersionCodes.has(proc.code) && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: '#E7F1FB', color: '#2471A3', border: '1px solid #AED6F1' }}>
                            Version de l’organisation
                          </span>
                        )}
                        {proc.phase && (
                          <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{
                              backgroundColor: proc.phase === 'alerte' ? '#FEF9E7' : '#FDEDEC',
                              color: proc.phase === 'alerte' ? '#F39C12' : '#C0392B',
                              border: `1px solid ${proc.phase === 'alerte' ? '#FAD7A0' : '#F1948A'}`,
                            }}>
                            {proc.phase === 'alerte' ? 'Alerte' : 'Alarme'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold break-words"
                        style={{ color: '#2C3E50' }}>
                        {proc.titleFR}
                      </p>
                      </div>
                    </div>

                    {/* Méta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 flex-shrink-0 w-full lg:w-auto lg:justify-end">
                      {proc.code === 'P001' && !proc.roleSections?.length && !proc.totalSteps ? (
                        <span className="text-xs whitespace-nowrap" style={{ color: '#6C757D' }}>
                          Consignes pour tous · en tête des procédures
                        </span>
                      ) : (
                        <>
                          <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                            {proc.roleSections?.length || 0} rôle(s)
                          </span>
                          <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                            {proc.totalSteps} étape(s)
                          </span>
                        </>
                      )}
                      <span className="text-xs px-2 py-0.5 font-medium whitespace-nowrap"
                        style={{
                          backgroundColor: '#F8F9FA',
                          color: '#495057',
                          border: '1px solid #DEE2E6',
                          borderRadius: '3px',
                        }}>
                        {getActivationLabel(proc.activationRule)}
                      </span>
                      <span className="text-sm font-medium w-4 text-center ml-auto lg:ml-0"
                        style={{ color: '#ADB5BD' }}>
                        {expandedProc === proc.id ? '−' : '+'}
                      </span>
                    </div>
                  </div>

                  {/* Rôles expandés */}
                  {expandedProc === proc.id && (
                    <>
                      <div style={{ borderTop: '1px solid #F0F0F0' }}>
                        {(proc.roleSections || []).map((rs: any, idx: number) => (
                          <div key={idx}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-2.5"
                            style={{
                              borderBottom: idx < proc.roleSections.length - 1
                                ? '1px solid #F8F9FA' : 'none',
                              backgroundColor: '#FAFAFA',
                            }}>
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: rs.headerColor }} />
                              <p className="text-xs font-medium break-words" style={{ color: '#495057' }}>
                                {rs.roleLabelFR}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <span className="text-xs font-mono px-1.5 py-0.5 whitespace-nowrap"
                                style={{
                                  backgroundColor: '#F0F0F0',
                                  color: '#6C757D',
                                  borderRadius: '2px',
                                }}>
                                {rs.roleCode}
                              </span>
                              <span className="text-xs whitespace-nowrap" style={{ color: '#ADB5BD' }}>
                                {rs.stepCount} étape{rs.stepCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isManager && (
                        <div className="px-4 py-2 flex flex-wrap items-center gap-3"
                          style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #EFEFEF' }}>
                          <button type="button"
                            onClick={() => router.push(`/library/procedures/${proc.id}`)}
                            className="text-xs px-3 py-1.5 rounded text-white"
                            style={{ backgroundColor: '#C0392B' }}>
                            {orgVersionCodes.has(proc.code) ? 'Modifier la version de l’organisation' : 'Personnaliser pour l’organisation'}
                          </button>
                          <span className="text-xs" style={{ color: '#6C757D' }}>
                            S’applique à tous les projets de l’organisation qui n’ont pas leur propre version.
                          </span>
                        </div>
                      )}
                      <div className="px-4 py-2 flex flex-wrap gap-2"
                        style={{ backgroundColor: '#F8F9FA', borderTop: '1px solid #EFEFEF' }}>
                        {proc.documentTypes.map((dt: string) => (
                          <span key={dt} className="text-xs px-2 py-0.5 font-medium whitespace-nowrap"
                            style={{
                              backgroundColor: '#FDEDEC',
                              color: '#C0392B',
                              border: '1px solid #F1948A',
                              borderRadius: '3px',
                            }}>
                            {dt}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MODÈLES DE PROJET ── */}
          {activeTab === 'templates' && (
            <div className="grid gap-1.5">
              <p className="text-xs mb-2" style={{ color: '#6C757D' }}>
                Un modèle reprend les réponses du configurateur d’un projet pour démarrer un autre bâtiment du même type
                (Projet → 💾 Modèle). Il se choisit à la création d’un projet.
              </p>
              {visibleTemplates.map(template => {
                const canDelete = isManager || template.createdById === user?.id;
                return (
                  <div key={template.id} className="flex items-start justify-between gap-3 p-3"
                    style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', borderRadius: '4px' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium break-words" style={{ color: '#2C3E50' }}>
                        {template.name}
                        <span className="ml-2 text-xs px-1.5 py-0.5"
                          style={{ backgroundColor: '#EBF5FB', color: '#2980B9', borderRadius: '3px' }}>
                          {template.documentType}
                        </span>
                      </p>
                      {template.description && (
                        <p className="text-xs break-words mt-0.5" style={{ color: '#6C757D' }}>{template.description}</p>
                      )}
                      <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
                        {template.createdBy ? `${template.createdBy.firstName} ${template.createdBy.lastName}`.trim() : 'Auteur inconnu'}
                        {' · '}{new Date(template.createdAt).toLocaleDateString('fr-CA')}
                      </p>
                    </div>
                    {canDelete && (
                      <button type="button" onClick={() => deleteTemplate(template)}
                        className="text-xs px-3 py-1.5 rounded flex-shrink-0"
                        style={{ border: '1px solid #F1948A', color: '#C0392B', backgroundColor: '#FFFFFF' }}>
                        Supprimer
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
