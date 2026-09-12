'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../../../store/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

const apiPut = async (path: string, body: any) => {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('coro_client_token')}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Erreur mise à jour');
  return res.json();
};
import PortalLayout from '../../../components/PortalLayout';
import { UserPlus, Download, Trash2, QrCode, Shield } from 'lucide-react';
import QRCode from 'qrcode';

const EMERGENCY_ROLES = [
  { value: 'COORDINATOR',      label: 'Coordonnateur' },
  { value: 'EPI',              label: 'Équipier de première intervention' },
  { value: 'ASSEMBLY_WARDEN',  label: 'Responsable point de rassemblement' },
  { value: 'SEARCHER',         label: 'Chercheur' },
  { value: 'EXIT_WARDEN',      label: 'Surveillant de sortie' },
  { value: 'PNA_ESCORT',       label: 'Accompagnateur PNA' },
  { value: 'FIRST_AIDER',      label: 'Secouriste' },
];

const QUALIFICATIONS = [
  { value: 'FIRST_AID_CPR',      label: 'Premiers soins / RCR' },
  { value: 'AED',                label: 'Défibrillateur (DEA)' },
  { value: 'FIRE_EXTINGUISHER',  label: 'Extincteur' },
  { value: 'EPI_TRAINING',       label: 'Formation EPI' },
  { value: 'HAZMAT',             label: 'Matières dangereuses' },
  { value: 'OTHER',              label: 'Autre' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(
  EMERGENCY_ROLES.map(r => [r.value, r.label])
);

const EMPTY_FORM = {
  firstName: '', lastName: '', poste: '', email: '', phone: '',
  isEmergencyMember: false,
  emergencyRole: '',
  emergencyAssignType: 'PRIMARY',
  emergencyZone: '',
  qualifications: [] as string[],
  smsConsent: false,
};

export default function EmployesPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (emp: any) => {
    setEditingId(emp.id);
    setShowForm(false);
    setForm({
      firstName:            emp.firstName || '',
      lastName:             emp.lastName  || '',
      poste:                emp.poste     || '',
      email:                emp.email     || '',
      phone:                emp.phone     || '',
      isEmergencyMember:    emp.isEmergencyMember || false,
      emergencyRole:        emp.emergencyRoles?.[0]?.role        || '',
      emergencyAssignType:  emp.emergencyRoles?.[0]?.assignType  || 'PRIMARY',
      emergencyZone:        emp.emergencyRoles?.[0]?.zone        || '',
      qualifications:       emp.qualifications?.map((q: any) => q.type) || [],
      smsConsent:           emp.smsConsent || false,
    });
  };

  const handleUpdate = async () => {
    if (!editingId || !form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/occupancy/employees/${editingId}`, form);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchAll();
  }, [buildingId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [emps, kiosk] = await Promise.all([
        apiGet(`/occupancy/buildings/${buildingId}/employees`),
        apiGet(`/occupancy/buildings/${buildingId}/kiosk-token`),
      ]);
      setEmployees(emps);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      await apiPost('/occupancy/employees', { ...form, buildingId });
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      fetchAll();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Désactiver cet employé ?')) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'}/occupancy/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('coro_client_token')}` },
      });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleDownloadQr = async (employee: any) => {
    const qrUrl = `https://client.getcoro.io/kiosk/qr/${employee.qrToken}`;
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, qrUrl, { width: 400, margin: 2 });
    const newCanvas = document.createElement('canvas');
    newCanvas.width = 400; newCanvas.height = 460;
    const newCtx = newCanvas.getContext('2d')!;
    newCtx.fillStyle = '#FFFFFF';
    newCtx.fillRect(0, 0, 400, 460);
    newCtx.drawImage(canvas, 0, 0);
    newCtx.fillStyle = '#2C3E50';
    newCtx.font = 'bold 20px Arial';
    newCtx.textAlign = 'center';
    newCtx.fillText(`${employee.firstName} ${employee.lastName}`, 200, 430);
    if (employee.poste) {
      newCtx.font = '16px Arial';
      newCtx.fillStyle = '#6C757D';
      newCtx.fillText(employee.poste, 200, 455);
    }
    const link = document.createElement('a');
    link.download = `QR_${employee.lastName}_${employee.firstName}.png`;
    link.href = newCanvas.toDataURL('image/png');
    link.click();
  };

  const toggleQual = (val: string) => {
    setForm(prev => ({
      ...prev,
      qualifications: prev.qualifications.includes(val)
        ? prev.qualifications.filter(q => q !== val)
        : [...prev.qualifications, val],
    }));
  };

  const getEmergencyRoleInfo = (emp: any) => {
    if (!emp.isEmergencyMember || !emp.emergencyRoles?.length) return null;
    const r = emp.emergencyRoles[0];
    return { label: ROLE_LABELS[r.role] || r.role, isAlt: r.assignType === 'ALTERNATE' };
  };

  if (loading) {
    return (
      <PortalLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <p className="animate-pulse" style={{ color: '#ADB5BD', fontSize: 14 }}>Chargement...</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <header style={{ marginBottom: 24 }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}>
          ← Retour au registre
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50' }}>Employés enregistrés</h1>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', backgroundColor: '#2C3E50', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <UserPlus size={16} /> Ajouter un employé
          </button>
        </div>
      </header>

      {/* ── Formulaire édition ── */}
      {editingId && (
        <div style={{ marginBottom: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, border: '2px solid #2980B9' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>✏️ Modifier l'employé</h3>

          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identité</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { key: 'firstName', label: 'Prénom *' },
              { key: 'lastName',  label: 'Nom *' },
              { key: 'poste',     label: 'Poste' },
              { key: 'email',     label: 'Courriel' },
              { key: 'phone',     label: 'Téléphone' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                <input type="text" value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>

          {/* Consentement SMS */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '12px 14px', borderRadius: 8, backgroundColor: form.smsConsent ? '#EAFAF1' : '#F8F9FA', border: `1px solid ${form.smsConsent ? '#A9DFBF' : '#E9ECEF'}` }}>
              <input type="checkbox" checked={form.smsConsent}
                onChange={e => setForm(prev => ({ ...prev, smsConsent: e.target.checked }))}
                style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: 'pointer', accentColor: '#27AE60' }} />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: form.smsConsent ? '#27AE60' : '#2C3E50' }}>
                  Consentement SMS confirmé
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6C757D', lineHeight: 1.5 }}>
                  L'employé a accepté de recevoir à ce numéro les alertes de sécurité, avis d'alarme, consignes d'évacuation et autres notifications d'urgence concernant ce bâtiment.
                </p>
              </div>
            </label>
          </div>

          <div style={{ borderTop: '1px solid #F1F3F5', paddingTop: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={15} color="#C0392B" />
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Organisation d'urgence</p>
              </div>
              <button type="button"
                onClick={() => setForm(prev => ({ ...prev, isEmergencyMember: !prev.isEmergencyMember, emergencyRole: '', emergencyAssignType: 'PRIMARY', emergencyZone: '', qualifications: [] }))}
                style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  borderColor: form.isEmergencyMember ? '#C0392B' : '#DEE2E6',
                  backgroundColor: form.isEmergencyMember ? '#FDEDEC' : '#F8F9FA',
                  color: form.isEmergencyMember ? '#C0392B' : '#6C757D' }}>
                {form.isEmergencyMember ? '🛡️ Membre actif' : 'Non membre'}
              </button>
            </div>
            {form.isEmergencyMember && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Rôle principal</label>
                    <select value={form.emergencyRole} onChange={e => setForm(prev => ({ ...prev, emergencyRole: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}>
                      <option value="">— Sélectionner —</option>
                      {EMERGENCY_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 'PRIMARY', l: 'Titulaire' }, { v: 'ALTERNATE', l: 'Substitut' }].map(opt => (
                        <button key={opt.v} type="button" onClick={() => setForm(prev => ({ ...prev, emergencyAssignType: opt.v }))}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            borderColor: form.emergencyAssignType === opt.v ? '#C0392B' : '#E9ECEF',
                            backgroundColor: form.emergencyAssignType === opt.v ? '#FDEDEC' : '#FFFFFF',
                            color: form.emergencyAssignType === opt.v ? '#C0392B' : '#6C757D' }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Secteur / Étage</label>
                    <input type="text" placeholder="ex: 3e étage, Aile Est" value={form.emergencyZone}
                      onChange={e => setForm(prev => ({ ...prev, emergencyZone: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 8, textTransform: 'uppercase' }}>Qualifications</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {QUALIFICATIONS.map(q => {
                      const active = form.qualifications.includes(q.value);
                      return (
                        <button key={q.value} type="button" onClick={() => toggleQual(q.value)}
                          style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            borderColor: active ? '#27AE60' : '#DEE2E6',
                            backgroundColor: active ? '#EAFAF1' : '#F8F9FA',
                            color: active ? '#27AE60' : '#6C757D' }}>
                          {active ? '✓ ' : ''}{q.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleUpdate} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#2980B9', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enregistrement...' : '💾 Sauvegarder'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); setForm({ ...EMPTY_FORM }); }}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Formulaire ajout ── */}
      {showForm && (
        <div style={{ marginBottom: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Nouvel employé</h3>

          {/* Identité */}
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identité</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { key: 'firstName', label: 'Prénom *' },
              { key: 'lastName',  label: 'Nom *' },
              { key: 'poste',     label: 'Poste' },
              { key: 'email',     label: 'Courriel' },
              { key: 'phone',     label: 'Téléphone' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                <input type="text" value={(form as any)[f.key]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>

          {/* Organisation d'urgence */}
          <div style={{ borderTop: '1px solid #F1F3F5', paddingTop: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield size={15} color="#C0392B" />
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Organisation d'urgence</p>
              </div>
              <button type="button"
                onClick={() => setForm(prev => ({ ...prev, isEmergencyMember: !prev.isEmergencyMember, emergencyRole: '', emergencyAssignType: 'PRIMARY', emergencyZone: '', qualifications: [] }))}
                style={{ padding: '6px 14px', borderRadius: 20, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  borderColor: form.isEmergencyMember ? '#C0392B' : '#DEE2E6',
                  backgroundColor: form.isEmergencyMember ? '#FDEDEC' : '#F8F9FA',
                  color: form.isEmergencyMember ? '#C0392B' : '#6C757D' }}>
                {form.isEmergencyMember ? '🛡️ Membre actif' : 'Non membre'}
              </button>
            </div>

            {form.isEmergencyMember && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Rôle + Type + Zone */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Rôle principal</label>
                    <select value={form.emergencyRole}
                      onChange={e => setForm(prev => ({ ...prev, emergencyRole: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, backgroundColor: '#FFFFFF', boxSizing: 'border-box' }}>
                      <option value="">— Sélectionner —</option>
                      {EMERGENCY_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Type</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: 'PRIMARY', l: 'Titulaire' }, { v: 'ALTERNATE', l: 'Substitut' }].map(opt => (
                        <button key={opt.v} type="button"
                          onClick={() => setForm(prev => ({ ...prev, emergencyAssignType: opt.v }))}
                          style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                            borderColor: form.emergencyAssignType === opt.v ? '#C0392B' : '#E9ECEF',
                            backgroundColor: form.emergencyAssignType === opt.v ? '#FDEDEC' : '#FFFFFF',
                            color: form.emergencyAssignType === opt.v ? '#C0392B' : '#6C757D' }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>Secteur / Étage</label>
                    <input type="text" placeholder="ex: 3e étage, Aile Est"
                      value={form.emergencyZone}
                      onChange={e => setForm(prev => ({ ...prev, emergencyZone: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>

                {/* Qualifications */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 8, textTransform: 'uppercase' }}>Qualifications</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {QUALIFICATIONS.map(q => {
                      const active = form.qualifications.includes(q.value);
                      return (
                        <button key={q.value} type="button" onClick={() => toggleQual(q.value)}
                          style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            borderColor: active ? '#27AE60' : '#DEE2E6',
                            backgroundColor: active ? '#EAFAF1' : '#F8F9FA',
                            color: active ? '#27AE60' : '#6C757D' }}>
                          {active ? '✓ ' : ''}{q.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleAdd} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#27AE60', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enregistrement...' : '✅ Enregistrer'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Liste employés ── */}
      <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Liste des employés</h2>
          <span style={{ fontSize: 12, color: '#ADB5BD' }}>{employees.length} employé{employees.length !== 1 ? 's' : ''}</span>
        </div>
        {employees.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <QrCode size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucun employé enregistré. Ajoutez-en un pour générer leur QR code.</p>
          </div>
        ) : (
          employees.map((emp, i) => {
            const roleInfo = getEmergencyRoleInfo(emp);
            return (
              <div key={emp.id} style={{ padding: '14px 20px', borderBottom: i < employees.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800,
                  backgroundColor: emp.isEmergencyMember ? '#FDEDEC' : '#EBF5FB',
                  color: emp.isEmergencyMember ? '#C0392B' : '#2980B9' }}>
                  {emp.isEmergencyMember ? <Shield size={18} /> : emp.firstName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{emp.firstName} {emp.lastName}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                    <span style={{ fontSize: 12, color: '#ADB5BD' }}>
                      {emp.poste || '—'}{emp.email ? ` · ${emp.email}` : ''}
                    </span>
                    {roleInfo && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', backgroundColor: '#FDEDEC', padding: '2px 7px', borderRadius: 4 }}>
                        {roleInfo.isAlt ? 'Sub. — ' : ''}{roleInfo.label}
                      </span>
                    )}
                    {emp.qualifications?.length > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#27AE60' }}>
                        {emp.qualifications.length} qualification{emp.qualifications.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => handleDownloadQr(emp)} title="Télécharger QR"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
                    <Download size={14} /> QR Code
                  </button>
                  <button type="button" onClick={() => handleEdit(emp)} title="Modifier"
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #AED6F1', backgroundColor: '#EBF5FB', cursor: 'pointer', color: '#2980B9' }}>
                    ✏️
                  </button>
                  <button type="button" onClick={() => handleDelete(emp.id)} title="Supprimer"
                    style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FADBD8', backgroundColor: '#FDEDEC', cursor: 'pointer', color: '#C0392B' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </section>

      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/invitations`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
          Gérer les invitations visiteurs →
        </button>
      </div>
    </PortalLayout>
  );
}