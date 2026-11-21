'use client';

import { useEffect, useState } from 'react';
import { readEmergencyCard, type EmergencyCard } from './emergency-card';

/**
 * Page hors ligne (audit M2-10). Sans serveur, ni alerte ni incident ne
 * peuvent partir : la page le dit clairement et donne le réflexe vital
 * (911), les consignes de base et l'adresse des bâtiments.
 */
const CONSIGNES = [
  { titre: 'Incendie ou fumée', texte: 'Déclenchez l’alarme, évacuez par l’escalier, ne prenez pas l’ascenseur. Rendez-vous au point de rassemblement.' },
  { titre: 'Menace ou violence', texte: 'Fuyez si vous le pouvez. Sinon, cachez-vous, verrouillez, silence. Appelez le 911 quand vous êtes en sécurité.' },
  { titre: 'Urgence médicale', texte: 'Appelez le 911, restez avec la personne, envoyez quelqu’un chercher le DEA et accueillir les secours.' },
];

export default function OfflinePage() {
  const [card, setCard] = useState<EmergencyCard | null>(null);
  useEffect(() => setCard(readEmergencyCard()), []);

  return (
    <main style={{ minHeight: '100vh', backgroundColor: '#F8F9FA', padding: 20, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        <div role="alert" className="rounded-md" style={{ backgroundColor: '#FFFFFF', border: '2px solid #C0392B', padding: 20, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#2C3E50' }}>
            Connexion non disponible · No connection
          </h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#6C757D', lineHeight: 1.5 }}>
            Aucune alerte CORO ne peut partir sans connexion. En cas d’urgence, appelez directement les secours.
            <br />
            CORO alerts cannot be sent offline. In an emergency, call 911 directly.
          </p>
          <a href="tel:911" className="rounded"
            style={{ display: 'block', padding: '18px 16px', backgroundColor: '#C0392B', color: '#FFFFFF', fontSize: 26, fontWeight: 900, textDecoration: 'none' }}>
            Composez le 911 · Call 911
          </a>
        </div>

        {card && card.buildings.length > 0 && (
          <section className="rounded-md" style={{ marginTop: 16, backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', padding: 16 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>
              Adresse à donner au 911
            </h2>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {card.buildings.map((b) => (
                <li key={`${b.name}-${b.address}`} style={{ padding: '8px 0', borderTop: '1px solid #F1F3F5' }}>
                  <strong style={{ color: '#2C3E50', fontSize: 14 }}>{b.name}</strong>
                  {b.address && <div style={{ color: '#2C3E50', fontSize: 14 }}>{b.address}</div>}
                  {b.responsable && <div style={{ color: '#6C757D', fontSize: 12 }}>Responsable : {b.responsable}</div>}
                </li>
              ))}
            </ul>
            <p style={{ margin: '8px 0 0', fontSize: 11, color: '#ADB5BD' }}>
              Dernière mise à jour sur cet appareil : {new Date(card.savedAt).toLocaleString('fr-CA', { timeZone: 'America/Toronto' })}
            </p>
          </section>
        )}

        <section className="rounded-md" style={{ marginTop: 16, backgroundColor: '#FFFFFF', border: '1px solid #DEE2E6', padding: 16 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#2C3E50' }}>Consignes de base</h2>
          {CONSIGNES.map((c) => (
            <div key={c.titre} style={{ padding: '8px 0', borderTop: '1px solid #F1F3F5' }}>
              <strong style={{ color: '#2C3E50', fontSize: 14 }}>{c.titre}</strong>
              <div style={{ color: '#6C757D', fontSize: 13, lineHeight: 1.5 }}>{c.texte}</div>
            </div>
          ))}
        </section>

        <p style={{ marginTop: 16, fontSize: 12, color: '#6C757D', textAlign: 'center' }}>
          Les pointages de la borne sont gardés sur l’appareil et seront synchronisés au retour de la connexion.
        </p>
      </div>
    </main>
  );
}
