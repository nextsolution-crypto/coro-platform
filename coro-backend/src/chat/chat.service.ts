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

      return { reply, transferToAgent: shouldTransfer };
    } catch (e) {
      console.error('Erreur Claude API:', e);
      return { reply: 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement à info@getcoro.io.', transferToAgent: false };
    }
  }
}