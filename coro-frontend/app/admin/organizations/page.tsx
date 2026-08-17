'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import AppLayout from '@/components/layout/AppLayout';

interface Organization {
  id: string;
  name: string;
  isInternal: boolean;
  licenseType: string;
  isActive: boolean;
  createdAt: string;
  _count: { users: number; projects: number; clients: number; buildings: number };
}

const licenseColors: Record<string, { bg: string; text: string; border: string }> = {
  ESSAI_GRATUIT: { bg: '#F8F9FA', text: '#6C757D', border: '#DEE2E6' },
  STANDARD:      { bg: '#EBF5FB', text: '#2980B9', border: '#AED6F1' },
  ENTREPRISE:    { bg: '#F4ECF7', text: '#8E44AD', border: '#D2B4DE' },
};

const licenseLabels: Record<string, string> = {
  ESSAI_GRATUIT: 'Essai gratuit',
  STANDARD: 'Standard',
  ENTREPRISE: 'Entreprise',
};

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface Member { firstName: string; lastName: string; email: string; role: string; }

const STEPS = ['Organisation', 'Administrateur', 'Membres', 'Récapitulatif'];

export default function OrganizationsAdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, initAuth } = useAuthStore();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState('');

  const [orgForm, setOrgForm] = useState({ name: '', licenseType: 'ESSAI_GRATUIT', province: 'Quebec' });
  const [adminForm, setAdminForm] = useState({ firstName: '', lastName: '', email: '', title: 'Administrateur CORO', password: generatePassword() });
  const [members, setMembers] = useState<Member[]>([]);
  const [newMember, setNewMember] = useState<Member>({ firstName: '', lastName: '', email: '', role: 'ADVISOR' });

  useEffect(() => { initAuth(); }, []);
  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role !== 'SUPER_ADMIN') { router.push('/dashboard'); return; }
      fetchData();
    } else {
      const token = localStorage.getItem('coro_token');
      if (!token) router.push('/login');
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const res = await api.get('/organizations');
      setOrganizations(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleChangeLicense = async (orgId: string, licenseType: string) => {
    try { await api.put(`/organizations/${orgId}/license`, { licenseType }); fetchData(); }
    catch (err) { console.error(err); }
  };

  const handleToggleActive = async (orgId: string, isActive: boolean) => {
    try { await api.put(`/organizations/${orgId}/active`, { isActive }); fetchData(); }
    catch (err) { console.error(err); }
  };

  const openWizard = () => {
    setStep(1);
    setCreated(false);
    setError('');
    setOrgForm({ name: '', licenseType: 'ESSAI_GRATUIT', province: 'Quebec' });
    setAdminForm({ firstName: '', lastName: '', email: '', title: 'Administrateur CORO', password: generatePassword() });
    setMembers([]);
    setNewMember({ firstName: '', lastName: '', email: '', role: 'ADVISOR' });
    setShowWizard(true);
  };

  const addMember = () => {
    if (!newMember.firstName || !newMember.lastName || !newMember.email) return;
    setMembers(prev => [...prev, { ...newMember }]);
    setNewMember({ firstName: '', lastName: '', email: '', role: 'ADVISOR' });
  };

  const removeMember = (idx: number) => setMembers(prev => prev.filter((_, i) => i !== idx));

  const handleCreate = async () => {
    setCreating(true);
    setError('');
    try {
      await api.post('/organizations', {
        organizationName: orgForm.name,
        licenseType: orgForm.licenseType,
        province: orgForm.province,
        adminEmail: adminForm.email,
        adminPassword: adminForm.password,
        adminFirstName: adminForm.firstName,
        adminLastName: adminForm.lastName,
        adminTitle: adminForm.title,
        additionalMembers: members,
      });
      setCreated(true);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setCreating(false);
    }
  };

  const inputStyle = { border: '1px solid #CED4DA', color: '#2C3E50', backgroundColor: '#FFFFFF', width: '100%' };
  const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
    <label className="block text-sm font-medium mb-1.5" style={{ color: '#495057' }}>
      {children} {required && <span style={{ color: '#C0392B' }}>*</span>}
    </label>
  );

  if (loading) return <AppLayout><div className="text-center py-12"><p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>Chargement...</p></div></AppLayout>;

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#2C3E50' }}>Organisations clientes</h2>
          <p className="text-sm mt-1" style={{ color: '#6C757D' }}>{organizations.length} organisation{organizations.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openWizard}
          className="w-full sm:w-auto text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: '#C0392B' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
          + Nouvelle organisation
        </button>
      </div>

      <div className="grid gap-3">
        {organizations.map(org => {
          const lc = licenseColors[org.licenseType] || licenseColors.ESSAI_GRATUIT;
          return (
            <div key={org.id} className="rounded-md p-5"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E9ECEF', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', opacity: org.isActive ? 1 : 0.6 }}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                  <h3 className="font-semibold break-words" style={{ color: '#2C3E50' }}>{org.name}</h3>
                  {org.isInternal && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#2C3E50', color: '#FFFFFF' }}>CORO interne</span>}
                  {!org.isActive && <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>Suspendue</span>}
                </div>
                {!org.isInternal && (
                  <select value={org.licenseType} onChange={e => handleChangeLicense(org.id, e.target.value)}
                    className="w-full sm:w-auto text-xs px-2.5 py-2 sm:py-1.5 rounded-full font-medium focus:outline-none"
                    style={{ backgroundColor: lc.bg, color: lc.text, border: `1px solid ${lc.border}` }}>
                    <option value="ESSAI_GRATUIT">Essai gratuit</option>
                    <option value="STANDARD">Standard</option>
                    <option value="ENTREPRISE">Entreprise</option>
                  </select>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm mb-4" style={{ color: '#6C757D' }}>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.users}</span> utilisateur{org._count.users !== 1 ? 's' : ''}</div>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.projects}</span> projet{org._count.projects !== 1 ? 's' : ''}</div>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.clients}</span> client{org._count.clients !== 1 ? 's' : ''}</div>
                <div className="rounded px-3 py-2" style={{ backgroundColor: '#F8F9FA' }}><span className="font-medium">{org._count.buildings}</span> bâtiment{org._count.buildings !== 1 ? 's' : ''}</div>
              </div>
              {!org.isInternal && (
                <button onClick={() => handleToggleActive(org.id, !org.isActive)}
                  className="w-full sm:w-auto text-xs font-medium px-3 py-2 sm:py-1.5 rounded transition-colors"
                  style={{ border: `1px solid ${org.isActive ? '#DEE2E6' : '#A9DFBF'}`, color: org.isActive ? '#6C757D' : '#27AE60' }}>
                  {org.isActive ? 'Suspendre' : 'Réactiver'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── WIZARD ── */}
      {showWizard && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-lg"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>

            {/* Header wizard */}
            <div className="p-6 pb-4" style={{ borderBottom: '1px solid #E9ECEF' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg" style={{ color: '#2C3E50' }}>
                  {created ? '✅ Organisation créée !' : 'Nouvelle organisation cliente'}
                </h3>
                <button onClick={() => setShowWizard(false)} style={{ color: '#ADB5BD', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
              </div>

              {/* Barre de progression */}
              {!created && (
                <div className="flex items-center gap-0">
                  {STEPS.map((label, i) => {
                    const num = i + 1;
                    const isActive = step === num;
                    const isDone = step > num;
                    return (
                      <div key={label} className="flex items-center flex-1">
                        <div className="flex flex-col items-center flex-1">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all"
                            style={{ backgroundColor: isDone ? '#27AE60' : isActive ? '#C0392B' : '#E9ECEF', color: isDone || isActive ? '#FFFFFF' : '#ADB5BD' }}>
                            {isDone ? '✓' : num}
                          </div>
                          <span className="text-xs mt-1 hidden sm:block" style={{ color: isActive ? '#C0392B' : isDone ? '#27AE60' : '#ADB5BD' }}>
                            {label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className="h-0.5 flex-1 mx-1" style={{ backgroundColor: step > num ? '#27AE60' : '#E9ECEF' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contenu du wizard */}
            <div className="p-6">
              {error && (
                <div className="rounded p-3 mb-4 text-sm" style={{ backgroundColor: '#FDEDEC', color: '#C0392B', border: '1px solid #F1948A' }}>{error}</div>
              )}

              {/* ÉTAPE 1 — Organisation */}
              {step === 1 && !created && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#6C757D' }}>Informations de base de la nouvelle organisation cliente.</p>
                  <div>
                    <Label required>Nom de l'organisation</Label>
                    <input type="text" value={orgForm.name} onChange={e => setOrgForm({ ...orgForm, name: e.target.value })}
                      placeholder="Ex: Firme Sécurité GardaWorld" className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                  <div>
                    <Label required>Niveau de licence</Label>
                    <select value={orgForm.licenseType} onChange={e => setOrgForm({ ...orgForm, licenseType: e.target.value })}
                      className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                      <option value="ESSAI_GRATUIT">Essai gratuit</option>
                      <option value="STANDARD">Standard</option>
                      <option value="ENTREPRISE">Entreprise</option>
                    </select>
                  </div>
                  <div>
                    <Label>Province principale</Label>
                    <select value={orgForm.province} onChange={e => setOrgForm({ ...orgForm, province: e.target.value })}
                      className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}>
                      <option value="Quebec">Québec</option>
                      <option value="Ontario">Ontario</option>
                      <option value="Alberta">Alberta</option>
                    </select>
                  </div>
                </div>
              )}

              {/* ÉTAPE 2 — Administrateur */}
              {step === 2 && !created && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#6C757D' }}>Le premier utilisateur de l'organisation. Il recevra ses identifiants par courriel et pourra ensuite inviter son équipe.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label required>Prénom</Label>
                      <input type="text" value={adminForm.firstName} onChange={e => setAdminForm({ ...adminForm, firstName: e.target.value })}
                        className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                    </div>
                    <div>
                      <Label required>Nom</Label>
                      <input type="text" value={adminForm.lastName} onChange={e => setAdminForm({ ...adminForm, lastName: e.target.value })}
                        className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                    </div>
                  </div>
                  <div>
                    <Label required>Courriel professionnel</Label>
                    <input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                      placeholder="admin@organisation.ca" className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                  <div>
                    <Label>Titre</Label>
                    <input type="text" value={adminForm.title} onChange={e => setAdminForm({ ...adminForm, title: e.target.value })}
                      className="rounded px-4 py-2.5 text-sm focus:outline-none" style={inputStyle}
                      onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                  </div>
                  <div>
                    <Label>Mot de passe temporaire</Label>
                    <div style={{ position: 'relative' }}>
                      <input type="text" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                        className="rounded px-4 py-2.5 text-sm focus:outline-none font-mono" style={{ ...inputStyle, paddingRight: 120 }}
                        onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      <button onClick={() => setAdminForm({ ...adminForm, password: generatePassword() })}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#6C757D', background: '#F8F9FA', border: '1px solid #DEE2E6', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>
                        Régénérer
                      </button>
                    </div>
                    <p className="text-xs mt-1" style={{ color: '#ADB5BD' }}>Ce mot de passe sera envoyé par courriel à l'administrateur.</p>
                  </div>
                </div>
              )}

              {/* ÉTAPE 3 — Membres additionnels */}
              {step === 3 && !created && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#6C757D' }}>Optionnel — Ajoutez les membres de l'équipe si vous les connaissez déjà. Chacun recevra ses identifiants par courriel.</p>

                  {/* Formulaire ajout membre */}
                  <div className="rounded-md p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: '#6C757D' }}>Ajouter un membre</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="text" value={newMember.firstName} onChange={e => setNewMember({ ...newMember, firstName: e.target.value })}
                        placeholder="Prénom" className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      <input type="text" value={newMember.lastName} onChange={e => setNewMember({ ...newMember, lastName: e.target.value })}
                        placeholder="Nom" className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="email" value={newMember.email} onChange={e => setNewMember({ ...newMember, email: e.target.value })}
                        placeholder="courriel@org.ca" className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}
                        onFocus={e => e.target.style.borderColor = '#C0392B'} onBlur={e => e.target.style.borderColor = '#CED4DA'} />
                      <select value={newMember.role} onChange={e => setNewMember({ ...newMember, role: e.target.value })}
                        className="rounded px-3 py-2 text-sm focus:outline-none" style={inputStyle}>
                        <option value="ADVISOR">Conseiller</option>
                        <option value="ADMIN">Administrateur</option>
                      </select>
                    </div>
                    <button onClick={addMember} disabled={!newMember.firstName || !newMember.lastName || !newMember.email}
                      className="w-full py-2 rounded text-sm font-medium transition-colors"
                      style={{ backgroundColor: newMember.firstName && newMember.lastName && newMember.email ? '#C0392B' : '#E9ECEF', color: newMember.firstName && newMember.lastName && newMember.email ? '#FFFFFF' : '#ADB5BD' }}>
                      + Ajouter ce membre
                    </button>
                  </div>

                  {/* Liste membres ajoutés */}
                  {members.length > 0 && (
                    <div className="space-y-2">
                      {members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between rounded-md p-3"
                          style={{ backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF' }}>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#2C3E50' }}>{m.firstName} {m.lastName}</p>
                            <p className="text-xs" style={{ color: '#6C757D' }}>{m.email} · {m.role === 'ADVISOR' ? 'Conseiller' : 'Administrateur'}</p>
                          </div>
                          <button onClick={() => removeMember(i)} style={{ color: '#C0392B', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {members.length === 0 && (
                    <p className="text-sm text-center py-4" style={{ color: '#ADB5BD' }}>
                      Aucun membre ajouté — vous pouvez passer à l'étape suivante et ajouter des membres plus tard.
                    </p>
                  )}
                </div>
              )}

              {/* ÉTAPE 4 — Récapitulatif */}
              {step === 4 && !created && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#6C757D' }}>Vérifiez les informations avant de créer l'organisation et d'envoyer les invitations.</p>

                  <div className="rounded-md p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Organisation</p>
                    <p className="font-semibold" style={{ color: '#2C3E50' }}>{orgForm.name}</p>
                    <p className="text-sm mt-1" style={{ color: '#6C757D' }}>{licenseLabels[orgForm.licenseType]} · {orgForm.province}</p>
                  </div>

                  <div className="rounded-md p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>Administrateur principal</p>
                    <p className="font-semibold" style={{ color: '#2C3E50' }}>{adminForm.firstName} {adminForm.lastName}</p>
                    <p className="text-sm mt-1" style={{ color: '#6C757D' }}>{adminForm.email} · {adminForm.title}</p>
                    <p className="text-xs mt-1 font-mono" style={{ color: '#ADB5BD' }}>Mot de passe : {adminForm.password}</p>
                  </div>

                  {members.length > 0 && (
                    <div className="rounded-md p-4" style={{ backgroundColor: '#F8F9FA', border: '1px solid #E9ECEF' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#ADB5BD' }}>{members.length} membre{members.length > 1 ? 's' : ''} additionnel{members.length > 1 ? 's' : ''}</p>
                      {members.map((m, i) => (
                        <p key={i} className="text-sm" style={{ color: '#2C3E50' }}>
                          {m.firstName} {m.lastName} <span style={{ color: '#ADB5BD' }}>— {m.email}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="rounded-md p-3" style={{ backgroundColor: '#EBF5FB', border: '1px solid #AED6F1' }}>
                    <p className="text-sm" style={{ color: '#1A5276' }}>
                      📧 Un courriel d'invitation sera envoyé automatiquement à <strong>{1 + members.length} personne{members.length > 0 ? 's' : ''}</strong> avec leurs identifiants de connexion.
                    </p>
                  </div>
                </div>
              )}

              {/* SUCCÈS */}
              {created && (
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">🎉</div>
                  <h4 className="text-xl font-semibold mb-2" style={{ color: '#2C3E50' }}>Organisation créée avec succès !</h4>
                  <p className="text-sm mb-2" style={{ color: '#6C757D' }}>
                    <strong>{orgForm.name}</strong> est maintenant active dans CORO.
                  </p>
                  <p className="text-sm mb-6" style={{ color: '#6C757D' }}>
                    {1 + members.length} invitation{members.length > 0 ? 's' : ''} envoyée{members.length > 0 ? 's' : ''} par courriel.
                  </p>
                  <button onClick={() => setShowWizard(false)}
                    className="text-white text-sm font-medium px-6 py-2.5 rounded"
                    style={{ backgroundColor: '#C0392B' }}>
                    Fermer
                  </button>
                </div>
              )}
            </div>

            {/* Footer navigation */}
            {!created && (
              <div className="flex items-center justify-between p-6 pt-0">
                <button onClick={() => step > 1 ? setStep(s => s - 1) : setShowWizard(false)}
                  className="text-sm font-medium px-4 py-2 rounded transition-colors"
                  style={{ border: '1px solid #DEE2E6', color: '#6C757D' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                  {step === 1 ? 'Annuler' : '← Précédent'}
                </button>

                <span className="text-xs" style={{ color: '#ADB5BD' }}>Étape {step} sur {STEPS.length}</span>

                {step < 4 ? (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    disabled={
                      (step === 1 && !orgForm.name) ||
                      (step === 2 && (!adminForm.firstName || !adminForm.lastName || !adminForm.email || !adminForm.password))
                    }
                    className="text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-40"
                    style={{ backgroundColor: '#C0392B' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#A93226'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#C0392B'}>
                    Suivant →
                  </button>
                ) : (
                  <button onClick={handleCreate} disabled={creating}
                    className="text-white text-sm font-medium px-5 py-2 rounded disabled:opacity-50"
                    style={{ backgroundColor: '#27AE60' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1E8449'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#27AE60'}>
                    {creating ? 'Création...' : '✓ Créer et envoyer les invitations'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}