'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, apiPut, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { UserPlus, Download, Trash2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

export default function EmployesPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', poste: '', email: '', phone: '' });
  const [kioskToken, setKioskToken] = useState('');

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
      setKioskToken(kiosk.token);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAdd = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    setSaving(true);
    try {
      await apiPost('/occupancy/employees', { ...form, buildingId });
      setForm({ firstName: '', lastName: '', poste: '', email: '', phone: '' });
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

    // Ajouter le nom sous le QR
    const ctx = canvas.getContext('2d')!;
    const newCanvas = document.createElement('canvas');
    newCanvas.width = 400;
    newCanvas.height = 460;
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

      {/* Formulaire ajout */}
      {showForm && (
        <div style={{ marginBottom: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Nouvel employé</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'firstName', label: 'Prénom *' },
              { key: 'lastName', label: 'Nom *' },
              { key: 'poste', label: 'Poste' },
              { key: 'email', label: 'Courriel' },
              { key: 'phone', label: 'Téléphone' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                <input type="text" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleAdd} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#27AE60', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enregistrement...' : '✅ Enregistrer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste employés */}
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
          employees.map((emp, i) => (
            <div key={emp.id} style={{ padding: '14px 20px', borderBottom: i < employees.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#EBF5FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: '#2980B9' }}>
                {emp.firstName.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{emp.firstName} {emp.lastName}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD' }}>
                  {emp.poste || '—'}{emp.email ? ` · ${emp.email}` : ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button type="button" onClick={() => handleDownloadQr(emp)} title="Télécharger QR"
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#F8F9FA', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#2C3E50' }}>
                  <Download size={14} /> QR Code
                </button>
                <button type="button" onClick={() => handleDelete(emp.id)} title="Supprimer"
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #FADBD8', backgroundColor: '#FDEDEC', cursor: 'pointer', color: '#C0392B' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Lien invitations */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/invitations`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#C0392B', fontWeight: 600 }}>
          Gérer les invitations visiteurs →
        </button>
      </div>
    </PortalLayout>
  );
}