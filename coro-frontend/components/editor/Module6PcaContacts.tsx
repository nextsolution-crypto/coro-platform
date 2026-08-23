'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import api from '@/lib/api';

// ── Types ──
interface ContactEntry {
  id: string;
  category: string;
  role: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

interface Props {
  projectId: string;
  language?: 'fr' | 'en';
}

function uid() { return Math.random().toString(36).slice(2, 9); }

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (raw.match(/^\d[-]\d[-]\d$/)) return raw;
  if (digits.length === 11 && digits[0] === '1') return `1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 11)}`;
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
  return raw;
}

const DEFAULT_CATEGORIES_FR = [
  'Cellule de gestion d\'incident',
  'Services d\'urgence',
  'Services municipaux et publics',
  'Assurances',
  'Fournisseurs critiques',
  'Autorités réglementaires',
  'Clients prioritaires',
  'Autres contacts',
];

const DEFAULT_CATEGORIES_EN = [
  'Incident Management Team',
  'Emergency Services',
  'Municipal and Public Services',
  'Insurance',
  'Critical Suppliers',
  'Regulatory Authorities',
  'Priority Clients',
  'Other Contacts',
];

const DEFAULT_CONTACTS_FR: ContactEntry[] = [
  { id: uid(), category: 'Services d\'urgence', role: 'Urgences (Police / Pompiers / Ambulance)', name: '', phone: '9-1-1', email: '' },
  { id: uid(), category: 'Services d\'urgence', role: 'Police (non-urgence)', name: '', phone: '', email: '' },
  { id: uid(), category: 'Services d\'urgence', role: 'Pompiers (non-urgence)', name: '', phone: '', email: '' },
  { id: uid(), category: 'Services municipaux et publics', role: 'Hydro-Québec (pannes)', name: '', phone: '1 (800) 790-2424', email: '' },
  { id: uid(), category: 'Services municipaux et publics', role: 'Énergir / Gaz Métro', name: '', phone: '1 (800) 361-8003', email: '' },
  { id: uid(), category: 'Services municipaux et publics', role: 'Ville / Municipalité', name: '', phone: '', email: '' },
  { id: uid(), category: 'Services municipaux et publics', role: 'Service des eaux', name: '', phone: '', email: '' },
  { id: uid(), category: 'Autorités réglementaires', role: 'CNESST (accidents travail)', name: '', phone: '1 (844) 838-0808', email: '' },
  { id: uid(), category: 'Autorités réglementaires', role: 'Commission d\'accès à l\'information', name: '', phone: '1 (888) 528-7741', email: '' },
];

export default function Module6PcaContacts({ projectId, language = 'fr' }: Props) {
  const isFr = language === 'fr';
  const [contacts, setContacts] = useState<ContactEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const categories = isFr ? DEFAULT_CATEGORIES_FR : DEFAULT_CATEGORIES_EN;

  useEffect(() => {
    loadContacts();
  }, [projectId]);

  useEffect(() => {
    if (contacts.length > 0 && !activeCategory) {
      setActiveCategory(contacts[0].category || categories[0]);
    }
  }, [contacts]);

  const loadContacts = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/module4`);
      const saved = res.data?.module4?.pcaContacts;
      if (saved && saved.length > 0) {
        setContacts(saved);
      } else {
        setContacts(DEFAULT_CONTACTS_FR);
      }
    } catch {
      setContacts(DEFAULT_CONTACTS_FR);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/module4`, {
        module4: { pcaContacts: contacts },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addContact = (category: string) => {
    setContacts(prev => [...prev, {
      id: uid(),
      category,
      role: '',
      name: '',
      phone: '',
      email: '',
      notes: '',
    }]);
  };

  const updateContact = useCallback((id: string, field: string, value: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  }, []);

  const contactsByCategory = categories.reduce((acc, cat) => {
    acc[cat] = contacts.filter(c => {
      if (isFr) return c.category === cat;
      const idx = DEFAULT_CATEGORIES_FR.indexOf(c.category);
      return idx !== -1 ? DEFAULT_CATEGORIES_EN[idx] === cat : c.category === cat;
    });
    return acc;
  }, {} as Record<string, ContactEntry[]>);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <p className="text-sm animate-pulse" style={{ color: '#ADB5BD' }}>
        {isFr ? 'Chargement...' : 'Loading...'}
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ color: '#2C3E50' }}>
            {isFr ? 'Répertoire de contacts opérationnels' : 'Operational Contact Directory'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: '#ADB5BD' }}>
            {isFr
              ? `${contacts.length} contact(s) — Organisés par catégorie`
              : `${contacts.length} contact(s) — Organized by category`}
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          style={{ backgroundColor: saved ? '#27AE60' : saving ? '#E8A89C' : '#C0392B' }}
          onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.backgroundColor = '#A93226'; }}
          onMouseLeave={e => { if (!saving && !saved) e.currentTarget.style.backgroundColor = '#C0392B'; }}>
          <Save size={14} />
          {saving ? (isFr ? 'Sauvegarde...' : 'Saving...') : saved ? '✓' : (isFr ? 'Sauvegarder' : 'Save')}
        </button>
      </div>

      {/* Onglets catégories */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map(cat => {
          const count = (contactsByCategory[cat] || []).length;
          return (
            <button key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeCategory === cat ? '#2C3E50' : '#F8F9FA',
                color: activeCategory === cat ? '#FFFFFF' : '#6C757D',
                border: `1px solid ${activeCategory === cat ? '#2C3E50' : '#E9ECEF'}`,
              }}>
              {cat.length > 25 ? cat.substring(0, 25) + '...' : cat}
              {count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: activeCategory === cat ? 'rgba(255,255,255,0.2)' : '#E9ECEF',
                    color: activeCategory === cat ? '#FFFFFF' : '#6C757D',
                  }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tableau de contacts */}
      {activeCategory && (
        <div className="rounded-md overflow-hidden" style={{ border: '1px solid #E9ECEF' }}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F8F9FA' }}>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-[30%]"
                  style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}>
                  {isFr ? 'Rôle / Fonction' : 'Role / Function'}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-[22%]"
                  style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}>
                  {isFr ? 'Nom' : 'Name'}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-[20%]"
                  style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}>
                  {isFr ? 'Téléphone' : 'Phone'}
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide w-[22%]"
                  style={{ color: '#6C757D', borderBottom: '1px solid #E9ECEF' }}>
                  {isFr ? 'Courriel' : 'Email'}
                </th>
                <th className="px-1 py-2.5 w-[6%]"
                  style={{ borderBottom: '1px solid #E9ECEF' }} />
              </tr>
            </thead>
            <tbody>
              {(contactsByCategory[activeCategory] || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm"
                    style={{ color: '#ADB5BD' }}>
                    {isFr ? 'Aucun contact — Cliquez sur + Ajouter pour commencer' : 'No contacts — Click + Add to start'}
                  </td>
                </tr>
              ) : (
                (contactsByCategory[activeCategory] || []).map((contact, idx) => (
                  <tr key={contact.id}
                    style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#EBF5FB'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'}>
                    <td className="px-1 py-1" style={{ borderBottom: '1px solid #F1F3F5' }}>
                      <input type="text" value={contact.role}
                        onChange={e => updateContact(contact.id, 'role', e.target.value)}
                        placeholder={isFr ? 'Ex: Coordonnateur PCA' : 'Ex: BCP Coordinator'}
                        className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none focus:bg-blue-50 rounded"
                        style={{ color: '#2C3E50' }} />
                    </td>
                    <td className="px-1 py-1" style={{ borderBottom: '1px solid #F1F3F5' }}>
                      <input type="text" value={contact.name}
                        onChange={e => updateContact(contact.id, 'name', e.target.value)}
                        placeholder={isFr ? 'Nom complet' : 'Full name'}
                        className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none focus:bg-blue-50 rounded"
                        style={{ color: '#2C3E50' }} />
                    </td>
                    <td className="px-1 py-1" style={{ borderBottom: '1px solid #F1F3F5' }}>
                      <input type="tel" value={contact.phone}
                        onChange={e => updateContact(contact.id, 'phone', formatPhone(e.target.value))}
                        placeholder="(514) 555-1234"
                        className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none focus:bg-blue-50 rounded"
                        style={{ color: '#2C3E50' }} />
                    </td>
                    <td className="px-1 py-1" style={{ borderBottom: '1px solid #F1F3F5' }}>
                      <input type="email" value={contact.email || ''}
                        onChange={e => updateContact(contact.id, 'email', e.target.value)}
                        placeholder={isFr ? 'courriel@exemple.ca' : 'email@example.ca'}
                        className="w-full px-2 py-1 text-sm bg-transparent border-0 outline-none focus:bg-blue-50 rounded"
                        style={{ color: '#2C3E50' }} />
                    </td>
                    <td className="px-1 py-1 text-center" style={{ borderBottom: '1px solid #F1F3F5' }}>
                      <button onClick={() => deleteContact(contact.id)}
                        className="p-1 rounded transition-colors"
                        style={{ color: '#DEE2E6' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#C0392B'}
                        onMouseLeave={e => e.currentTarget.style.color = '#DEE2E6'}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pied de tableau — Ajouter */}
          <div className="px-4 py-2" style={{ borderTop: '1px solid #F1F3F5', backgroundColor: '#FAFAFA' }}>
            <button
              onClick={() => addContact(
                isFr ? activeCategory : DEFAULT_CATEGORIES_FR[DEFAULT_CATEGORIES_EN.indexOf(activeCategory)] || activeCategory
              )}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors"
              style={{ color: '#2980B9' }}
              onMouseEnter={e => e.currentTarget.style.color = '#1A5276'}
              onMouseLeave={e => e.currentTarget.style.color = '#2980B9'}>
              <Plus size={14} />
              {isFr ? 'Ajouter un contact' : 'Add a contact'}
            </button>
          </div>
        </div>
      )}

      {/* Note */}
      <div className="p-3 rounded" style={{ backgroundColor: '#FEF9E7', border: '1px solid #FAD7A0' }}>
        <p className="text-xs" style={{ color: '#F39C12' }}>
          💡 {isFr
            ? 'Ces contacts seront inclus dans le Module 6 du document PCA exporté. Assurez-vous de les maintenir à jour.'
            : 'These contacts will be included in Module 6 of the exported BCP document. Make sure to keep them up to date.'}
        </p>
      </div>
    </div>
  );
}