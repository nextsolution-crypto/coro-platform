import { Injectable } from '@nestjs/common';

const CORO_CONTEXT = `Tu es l'assistant virtuel de CORO (Conformité Opérationnelle et Résilience Organisationnelle), une plateforme SaaS canadienne spécialisée dans la production et la gestion de documents de conformité pour les bâtiments commerciaux, institutionnels et industriels.

CORO permet de produire les documents suivants :
- PMU — Plan de mesures d'urgence
- PSI — Plan de sécurité incendie (requis par le CNPI 2020)
- PCA — Plan de continuité des activités
- PGC — Plan de gestion de crise
- PRA — Plan de reprise des activités
- PUE — Plan d'urgence environnementale

Le marché cible est le Québec.

CORO s'adresse aux conseillers en sécurité, gestionnaires d'immeubles, firmes de consultation en SST et toute organisation devant produire des documents de conformité réglementaire.

La plateforme comprend 3 interfaces :
1. app.getcoro.io — Plateforme conseiller (production des documents, configurateur intelligent, éditeur M1-M8, workflow d'approbation, export PDF, gestion des mandats et activités)
2. client.getcoro.io — Portail client (consultation, approbation et signature électronique des documents)
3. getcoro.io — Site vitrine

Fonctionnalités clés :
- Configurateur intelligent qui adapte le document au bâtiment (systèmes, certifications, rôles, matières dangereuses)
- Bibliothèque de 43 procédures standard (P001-P122)
- Générateur de procédures IA personnalisées
- Score de qualité documentaire (0-100)
- Validations intelligentes et alertes de renouvellement annuel
- Export PDF bilingue FR/EN avec filigrane et logo
- Workflow d'approbation interne (anti-auto-approbation)
- Portail client avec signature électronique
- Gestion des mandats, timelog et activités planifiées

Pour toute question sur les tarifs, les démos ou pour parler à un conseiller humain, réponds que tu vas transférer la conversation à l'équipe CORO et que quelqu'un les contactera sous peu.

Réponds toujours en français sauf si l'utilisateur écrit en anglais. Sois concis, professionnel et utile. Si tu ne connais pas la réponse, dis-le honnêtement et propose de transférer à l'équipe CORO.`;

@Injectable()
export class ChatService {
  async handleMessage(message: string, history: { role: string; content: string }[]): Promise<{ reply: string; transferToAgent: boolean }> {
    const messages = [
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: message },
    ];

    const transferKeywords = ['prix', 'tarif', 'coût', 'abonnement', 'démo', 'demo', 'parler', 'agent', 'humain', 'contact', 'price', 'pricing', 'talk to', 'human'];
    const shouldTransfer = transferKeywords.some(kw => message.toLowerCase().includes(kw));

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: CORO_CONTEXT,
          messages,
        }),
      });

      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Désolé, je n\'ai pas pu traiter votre message. Veuillez réessayer.';

      if (shouldTransfer) {
        // Notifier le conseiller par courriel
        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.BREVO_API_KEY || '',
            },
            body: JSON.stringify({
              sender: { name: 'CORO Chat IA', email: 'info@getcoro.io' },
              to: [{ email: 'info@getcoro.io', name: 'Équipe CORO' }],
              subject: '💬 Nouveau prospect — Demande de contact via le chat IA',
              htmlContent: `
                <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #2C3E50; padding: 24px; border-radius: 8px 8px 0 0;">
                    <span style="color: #FFFFFF; font-size: 24px; font-weight: 900;">CO<span style="color: #C0392B;">RO</span></span>
                  </div>
                  <div style="background: #FFFFFF; padding: 24px; border: 1px solid #E9ECEF; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #2C3E50; margin: 0 0 16px;">Nouveau prospect sur getcoro.io</h2>
                    <p style="color: #6C757D;">Un visiteur a demandé à parler à un conseiller via le chat IA.</p>
                    <div style="background: #F8F9FA; border-left: 4px solid #C0392B; padding: 16px; border-radius: 4px; margin: 16px 0;">
                      <p style="margin: 0; font-weight: 600; color: #2C3E50;">Message déclencheur :</p>
                      <p style="margin: 8px 0 0; color: #495057;">${message}</p>
                    </div>
                    <p style="color: #6C757D; font-size: 13px;">Réponse de l'IA : ${reply}</p>
                    <a href="mailto:${''}" style="display: inline-block; background: #C0392B; color: #FFFFFF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; margin-top: 16px;">
                      Contacter le prospect →
                    </a>
                  </div>
                </div>
              `,
            }),
          });
        } catch (e) {
          console.error('Erreur envoi email transfert:', e);
        }
      }

      return { reply, transferToAgent: shouldTransfer };
    } catch (e) {
      console.error('Erreur Claude API:', e);
      return { reply: 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement à info@getcoro.io.', transferToAgent: false };
    }
  }

  async notifyAgent(email: string, history: string): Promise<{ success: boolean }> {
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY || '',
        },
        body: JSON.stringify({
          sender: { name: 'CORO Chat IA', email: 'info@getcoro.io' },
          to: [{ email: 'info@getcoro.io', name: 'Équipe CORO' }],
          subject: '💬 Nouveau prospect — Demande de contact via getcoro.io',
          htmlContent: `
            <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;">
              <div style="background:#2C3E50;padding:24px;border-radius:8px 8px 0 0;">
                <span style="color:#FFFFFF;font-size:24px;font-weight:900;">CO<span style="color:#C0392B;">RO</span></span>
              </div>
              <div style="background:#FFFFFF;padding:24px;border:1px solid #E9ECEF;border-radius:0 0 8px 8px;">
                <h2 style="color:#2C3E50;margin:0 0 8px;">Nouveau prospect sur getcoro.io</h2>
                <p style="color:#6C757D;margin:0 0 20px;">Un visiteur souhaite être contacté par un conseiller.</p>
                <div style="background:#EAFAF1;border-left:4px solid #27AE60;padding:16px;border-radius:4px;margin:0 0 20px;">
                  <p style="margin:0;font-weight:700;color:#2C3E50;">📧 Courriel du prospect :</p>
                  <a href="mailto:${email}" style="color:#C0392B;font-size:16px;font-weight:700;">${email}</a>
                </div>
                <div style="background:#F8F9FA;border-left:4px solid #2C3E50;padding:16px;border-radius:4px;">
                  <p style="margin:0 0 12px;font-weight:700;color:#2C3E50;">💬 Historique de la conversation :</p>
                  <pre style="margin:0;font-size:13px;color:#495057;white-space:pre-wrap;line-height:1.6;">${history}</pre>
                </div>
                <a href="mailto:${email}" style="display:inline-block;background:#C0392B;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin-top:20px;">
                  Répondre au prospect →
                </a>
              </div>
            </div>
          `,
        }),
      });
      return { success: true };
    } catch (e) {
      console.error('Erreur envoi courriel prospect:', e);
      return { success: false };
    }
  }
}