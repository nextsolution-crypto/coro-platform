'use client';

import { useRef, useState } from 'react';
import { GlassButton, GlassField, GlassModal, GlassTable, PageHeader, StatusBadge } from '../kit';
import type { StatusTone } from '../kit';
import { LegacyIsland } from '../LegacyIsland';
import { useTheme } from '../theme/ThemeProvider';

const TONES: StatusTone[] = ['neutral', 'success', 'warning', 'danger', 'info', 'purple', 'emergency'];

/**
 * Terrain d'essai des primitives Liquid Glass (route /glass-kit, introuvable en production).
 * N'affiche que des exemples génériques : aucune donnée métier.
 */
export default function GlassKitPlayground() {
  const { ui, uiPreference, routeMode, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState('');
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const invalid = name.trim().length === 0;

  return (
    <div style={{ display: 'grid', gap: 32 }}>
      <PageHeader
        eyebrow="Outillage de développement"
        title="Kit Liquid Glass"
        subtitle={`Rendu effectif : ${ui} · préférence : ${uiPreference} · thème : ${resolvedTheme} · mode de route : ${routeMode}`}
        actions={
          <>
            <GlassButton onClick={() => setOpen(true)}>Ouvrir une modale</GlassButton>
            <GlassButton variant="danger" onClick={() => setConfirmOpen(true)}>Confirmation destructive</GlassButton>
          </>
        }
      />

      <section aria-labelledby="kit-badges">
        <h2 id="kit-badges" style={{ margin: '0 0 8px', fontSize: 16 }}>StatusBadge</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TONES.map((tone) => (
            <StatusBadge key={tone} tone={tone}>{tone === 'emergency' ? 'Urgence' : `Ton ${tone}`}</StatusBadge>
          ))}
        </div>
      </section>

      <section aria-labelledby="kit-buttons">
        <h2 id="kit-buttons" style={{ margin: '0 0 8px', fontSize: 16 }}>GlassButton</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <GlassButton>Secondaire</GlassButton>
          <GlassButton variant="primary">Principal</GlassButton>
          <GlassButton variant="danger">Supprimer</GlassButton>
          <GlassButton variant="ghost">Discret</GlassButton>
          <GlassButton disabled>Désactivé</GlassButton>
        </div>
      </section>

      <section aria-labelledby="kit-table">
        <h2 id="kit-table" style={{ margin: '0 0 8px', fontSize: 16 }}>GlassTable</h2>
        <GlassTable label="Exemple de tableau" interactive>
          <thead>
            <tr><th scope="col">Élément</th><th scope="col">Catégorie</th><th scope="col">État</th></tr>
          </thead>
          <tbody>
            <tr><td>Exemple A</td><td>Catégorie 1</td><td><StatusBadge tone="success">Validé</StatusBadge></td></tr>
            <tr><td>Exemple B</td><td>Catégorie 2</td><td><StatusBadge tone="warning">En révision</StatusBadge></td></tr>
            <tr><td>Exemple C</td><td>Catégorie 1</td><td><StatusBadge tone="emergency">Urgent</StatusBadge></td></tr>
          </tbody>
        </GlassTable>
      </section>

      <section aria-labelledby="kit-fields" style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <h2 id="kit-fields" style={{ margin: 0, fontSize: 16 }}>GlassField</h2>
        <GlassField label="Nom" hint="Texte d’aide associé au champ." required>
          {(c) => <input {...c} value={name} onChange={(e) => setName(e.target.value)} placeholder="Saisir un nom" />}
        </GlassField>
        <GlassField label="Champ en erreur" error="Cette valeur est obligatoire.">
          {(c) => <input {...c} defaultValue="" />}
        </GlassField>
        <GlassField label="Note">
          {(c) => <textarea {...c} defaultValue="" />}
        </GlassField>
      </section>

      <section aria-labelledby="kit-island">
        <h2 id="kit-island" style={{ margin: '0 0 8px', fontSize: 16 }}>Îlot Legacy (aperçu)</h2>
        <LegacyIsland>
          <p style={{ color: '#2C3E50', fontWeight: 600 }}>Contenu Legacy aux couleurs en dur</p>
          <p style={{ color: '#6C757D', fontSize: 13 }}>Texte secondaire historique</p>
          <button style={{ backgroundColor: '#C0392B', color: '#FFFFFF', padding: '8px 16px', borderRadius: 4, border: 0 }}>Action Legacy</button>
        </LegacyIsland>
      </section>

      <GlassModal
        open={open}
        onClose={() => setOpen(false)}
        title="Exemple de modale"
        description="Le focus est piégé dans la boîte ; Échap la ferme et rend le focus au bouton d’origine."
        initialFocusRef={firstFieldRef}
        footer={
          <>
            <GlassButton onClick={() => setOpen(false)}>Annuler</GlassButton>
            <GlassButton variant="primary" onClick={() => setOpen(false)} disabled={invalid}>Enregistrer</GlassButton>
          </>
        }
      >
        <GlassField label="Nom" error={invalid ? 'Saisir un nom.' : undefined} required>
          {(c) => <input {...c} ref={firstFieldRef} value={name} onChange={(e) => setName(e.target.value)} />}
        </GlassField>
      </GlassModal>

      <GlassModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        tone="danger"
        size="sm"
        title="Confirmer la suppression ?"
        description="Cette action est définitive."
        footer={
          <>
            <GlassButton onClick={() => setConfirmOpen(false)}>Annuler</GlassButton>
            <GlassButton variant="danger" onClick={() => setConfirmOpen(false)}>Supprimer</GlassButton>
          </>
        }
      >
        <p style={{ margin: 0 }}>Exemple de dialogue de confirmation destructive.</p>
      </GlassModal>
    </div>
  );
}
