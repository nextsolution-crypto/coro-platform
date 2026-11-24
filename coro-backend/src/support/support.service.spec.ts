import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportActor, SupportService } from './support.service';

const advisor: SupportActor = { kind: 'USER', userId: 'u-adv', organizationId: 'org-firm', role: 'OPERATOR' };
const firmAdmin: SupportActor = { kind: 'USER', userId: 'u-admin', organizationId: 'org-firm', role: 'ADMIN' };
const otherAdmin: SupportActor = { kind: 'USER', userId: 'u-other', organizationId: 'org-other', role: 'ADMIN' };
const coro: SupportActor = { kind: 'USER', userId: 'u-coro', organizationId: 'org-coro', role: 'SUPER_ADMIN' };
const client: SupportActor = { kind: 'CLIENT', clientUserId: 'cu-1', clientId: 'c-1', organizationId: 'org-firm', buildingIds: [] };

function harness() {
  const tickets: any[] = [];
  const messages: any[] = [];
  const notifications: any[] = [];
  let seq = 0;
  const withRelations = (t: any) => t && {
    ...t,
    messages: messages.filter((m) => m.ticketId === t.id).map((m) => ({ ...m, attachments: [] })),
    attachments: [],
  };
  const prisma: any = {
    supportTicket: {
      create: jest.fn(async ({ data }: any) => {
        const { messages: nested, ...rest } = data;
        const t = { id: `t${++seq}`, number: seq, status: 'NEW', assignedUserId: null, duplicateOfId: null, firstRespondedAt: null, resolvedAt: null, closedAt: null, archivedAt: null, createdAt: new Date(), updatedAt: new Date(), ...rest };
        tickets.push(t);
        if (nested?.create) messages.push({ id: `m${messages.length + 1}`, ticketId: t.id, internal: false, createdAt: new Date(), ...nested.create });
        return t;
      }),
      findUnique: jest.fn(async ({ where }: any) => withRelations(tickets.find((t) => t.id === where.id))),
      findMany: jest.fn(async ({ where }: any) => tickets.filter((t) =>
        (!where.requesterUserId || t.requesterUserId === where.requesterUserId) &&
        (!where.requesterClientUserId || t.requesterClientUserId === where.requesterClientUserId) &&
        (!where.queue || t.queue === where.queue) &&
        (!where.organizationId || t.organizationId === where.organizationId))),
      update: jest.fn(async ({ where, data }: any) => Object.assign(tickets.find((t) => t.id === where.id), data)),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => []),
    },
    supportTicketMessage: {
      create: jest.fn(async ({ data }: any) => {
        const m = { id: `m${messages.length + 1}`, internal: false, createdAt: new Date(), ...data };
        messages.push(m);
        return m;
      }),
    },
    notification: { create: jest.fn(async ({ data }: any) => void notifications.push(data)) },
    user: {
      findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, firstName: 'Ana', lastName: 'Roy', email: 'ana@example.test', organizationId: 'org-firm' })),
      findMany: jest.fn(async ({ where }: any) => (where.role === 'SUPER_ADMIN' ? [{ id: 'u-coro', organizationId: 'org-coro' }] : [{ id: 'u-admin', organizationId: 'org-firm' }])),
    },
    clientUser: { findUnique: jest.fn(async () => ({ firstName: 'Cli', lastName: 'Ent', email: 'cli@example.test' })) },
    building: { findFirst: jest.fn(async () => null) },
    organization: { findMany: jest.fn(async () => []) },
  };
  const email = { sendSupportTicketUpdate: jest.fn(async () => ({ success: true })) };
  const service = new SupportService(prisma, {} as any, email as any);
  return { service, tickets, messages, notifications, email };
}

const ticketInput = (type: string) => ({ type, impact: 'DISRUPTIVE', subject: 'Le bouton ne répond pas', message: 'Quand je clique, rien ne se passe sur la page.' });

describe('Centre d’aide : droits, routage, fil d’échange', () => {
  it('un conseiller ouvre un ticket : file CORO, numéro, délai, super admin notifié', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(advisor, { ...ticketInput('BUG'), context: { page: '/projects/1?token=secret', userAgent: 'UA' } });
    expect(view).toMatchObject({ reference: 'CORO-0001', queue: 'CORO', priority: 2, status: 'NEW', isRequester: true, isAgent: false });
    expect(h.tickets[0].context.page).toBe('/projects/1');
    expect(h.notifications).toEqual([expect.objectContaining({ userId: 'u-coro', type: 'SUPPORT_TICKET', link: '/support/console/t1' })]);
  });

  it('la question d’un client va à sa firme-conseil ; une autre firme ne la voit pas', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(client, ticketInput('QUESTION'));
    expect(view.queue).toBe('ADVISOR');
    expect(h.notifications[0]).toMatchObject({ userId: 'u-admin' });
    await expect(h.service.getTicket(otherAdmin, view.id)).rejects.toBeInstanceOf(NotFoundException);
    await expect(h.service.getTicket(coro, view.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await h.service.getTicket(firmAdmin, view.id) as any).isAgent).toBe(true);
  });

  it('un bug d’un client va à CORO, pas à la firme', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(client, ticketInput('BUG'));
    expect(view.queue).toBe('CORO');
    await expect(h.service.getTicket(firmAdmin, view.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('les notes internes restent invisibles du demandeur ; la réponse de l’agent le notifie', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(advisor, ticketInput('BUG'));
    await h.service.addMessage(coro, view.id, { body: 'Reproduit en local.', internal: true });
    await h.service.addMessage(coro, view.id, { body: 'Corrigé, pouvez-vous confirmer ?' });
    const asRequester: any = await h.service.getTicket(advisor, view.id);
    expect(asRequester.messages.map((m: any) => m.body)).toEqual(['Quand je clique, rien ne se passe sur la page.', 'Corrigé, pouvez-vous confirmer ?']);
    expect(asRequester.status).toBe('WAITING_REQUESTER');
    expect(asRequester.firstRespondedAt).toBeInstanceOf(Date);
    expect(asRequester.context).toBeUndefined();
    expect(h.email.sendSupportTicketUpdate).toHaveBeenCalledTimes(1);
    const asAgent: any = await h.service.getTicket(coro, view.id);
    expect(asAgent.messages).toHaveLength(3);
  });

  it('le demandeur ne peut pas écrire de note interne ni changer le statut', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(advisor, ticketInput('BUG'));
    await h.service.addMessage(advisor, view.id, { body: 'Toujours bloqué.', internal: true });
    expect(h.messages.at(-1).internal).toBe(false);
    await expect(h.service.updateAsAgent(advisor, view.id, { status: 'RESOLVED' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('une réponse du demandeur rouvre une demande résolue', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(advisor, ticketInput('BUG'));
    await h.service.updateAsAgent(coro, view.id, { status: 'RESOLVED' });
    await h.service.addMessage(advisor, view.id, { body: 'Le problème est revenu.' });
    expect(h.tickets[0].status).toBe('IN_PROGRESS');
    expect(h.tickets[0].resolvedAt).toBeNull();
  });

  it('une demande d’un conseiller ne peut pas être envoyée à la firme-conseil', async () => {
    const h = harness();
    const view: any = await h.service.createTicket(advisor, ticketInput('BUG'));
    await expect(h.service.updateAsAgent(coro, view.id, { queue: 'ADVISOR' })).rejects.toThrow('portail client');
  });
});
