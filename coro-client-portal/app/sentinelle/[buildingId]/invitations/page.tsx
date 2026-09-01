'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPost, getUser } from '../../../store/auth';
import PortalLayout from '../../../components/PortalLayout';
import { Mail, Clock, CheckCircle, XCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING:  { label: 'En attente', color: '#E67E22', bg: '#FEF5E7', icon: Clock },
  USED:     { label: 'Utilisée',   color: '#27AE60', bg: '#EAFAF1', icon: CheckCircle },
  EXPIRED:  { label: 'Expirée',    color: '#ADB5BD', bg: '#F8F9FA', icon: XCircle },
};

export default function InvitationsPage() {
  const router = useRouter();
  const params = useParams();
  const buildingId = params.buildingId as string;

  const [user, setUser] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    company: '', reason: '', hostName: '',
    visitDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const currentUser = getUser();
    if (!currentUser) { router.replace('/login'); return; }
    setUser(currentUser);
    fetchInvitations();
  }, [buildingId]);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/occupancy/buildings/${buildingId}/invitations`);
      setInvitations(res);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSend = async () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.visitDate) return;
    setSaving(true);
    try {
      await apiPost('/occupancy/invitations', { ...form, buildingId });
      setSaved(true);
      setForm({ firstName: '', lastName: '', email: '', company: '', reason: '', hostName: '', visitDate: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      fetchInvitations();
      setTimeout(() => setSaved(false), 4000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
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
        <button type="button" onClick={() => router.push(`/sentinelle/${buildingId}/employes`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ADB5BD', padding: 0, marginBottom: 8 }}>
          ← Retour aux employés
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#ADB5BD', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CORO Sentinelle</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(20px, 5vw, 26px)', fontWeight: 800, color: '#2C3E50' }}>Invitations visiteurs</h1>
          </div>
          <button type="button" onClick={() => setShowForm(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Mail size={16} /> Inviter un visiteur
          </button>
        </div>
      </header>

      {/* Confirmation envoi */}
      {saved && (
        <div style={{ marginBottom: 16, padding: '14px 18px', backgroundColor: '#EAFAF1', border: '1px solid #A9DFBF', borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 14, color: '#27AE60', fontWeight: 700 }}>
            ✅ Invitation envoyée ! Le visiteur recevra son QR code par courriel.
          </p>
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <div style={{ marginBottom: 20, padding: 24, backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Nouvelle invitation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'firstName', label: 'Prénom *', type: 'text' },
              { key: 'lastName',  label: 'Nom *',    type: 'text' },
              { key: 'email',     label: 'Courriel *', type: 'email' },
              { key: 'company',   label: 'Entreprise', type: 'text' },
              { key: 'hostName',  label: 'Personne visitée', type: 'text' },
              { key: 'reason',    label: 'Raison de la visite', type: 'text' },
              { key: 'visitDate', label: 'Date de visite *', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6C757D', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E9ECEF', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 16px', backgroundColor: '#EBF5FB', borderRadius: 8, marginBottom: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#2980B9' }}>
              📧 Un courriel avec un QR code personnel sera envoyé automatiquement au visiteur.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={handleSend} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 8, border: 'none', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Envoi en cours...' : '📧 Envoyer l\'invitation'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #E9ECEF', backgroundColor: '#FFFFFF', color: '#6C757D', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste invitations */}
      <section style={{ backgroundColor: '#FFFFFF', borderRadius: 12, border: '1px solid #E9ECEF', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E9ECEF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Invitations récentes</h2>
          <span style={{ fontSize: 12, color: '#ADB5BD' }}>{invitations.length} invitation{invitations.length !== 1 ? 's' : ''}</span>
        </div>
        {invitations.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <Mail size={32} color="#DEE2E6" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: 0, color: '#ADB5BD', fontSize: 14 }}>Aucune invitation envoyée pour l&apos;instant.</p>
          </div>
        ) : (
          invitations.map((inv, i) => {
            const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING;
            const Icon = sc.icon;
            const visitDate = new Date(inv.visitDate).toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <div key={inv.id} style={{ padding: '14px 20px', borderBottom: i < invitations.length - 1 ? '1px solid #F1F3F5' : 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: '#F5EEF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16, fontWeight: 800, color: '#8E44AD' }}>
                  {inv.firstName.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2C3E50' }}>{inv.firstName} {inv.lastName}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#ADB5BD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inv.email}{inv.company ? ` · ${inv.company}` : ''}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6C757D', fontWeight: 600 }}>📅 {visitDate}</p>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 10, backgroundColor: sc.bg, color: sc.color }}>
                    <Icon size={10} /> {sc.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>
    </PortalLayout>
  );
}