import { PrismaService } from '../prisma/prisma.service';

// Called only after the existing Brevo route authenticates and parses the event.
// Match provider IDs, never a name/address supplied by a webhook.
export async function reconcileSentinelleProviderEvent(
  prisma: PrismaService,
  channel: 'EMAIL' | 'SMS',
  event: {
    providerMessageId: string;
    eventType: string;
    providerOccurredAt: Date;
  },
) {
  const ids = [event.providerMessageId, `<${event.providerMessageId}>`];
  const delivered = event.eventType === 'DELIVERED';
  const failed = [
    'HARD_BOUNCE',
    'BLOCKED',
    'REJECTED',
    'ERROR',
    'INVALID',
  ].includes(event.eventType);
  if (!delivered && !failed) return;
  const incidents = await prisma.incidentNotificationDelivery.findMany({
    where: { channel, providerMessageId: { in: ids } },
    select: { id: true },
    take: 2,
  });
  const employees =
    channel === 'EMAIL'
      ? await prisma.buildingEmployee.findMany({
          where: { pinEmailMessageId: { in: ids } },
          select: { id: true },
          take: 2,
        })
      : [];
  if (incidents.length + employees.length !== 1) return;
  await prisma.$transaction(async (tx) => {
    if (incidents.length === 1) {
      await tx.incidentNotificationDelivery.updateMany({
        where: {
          id: incidents[0].id,
          channel,
          providerMessageId: { in: ids },
          status: { in: delivered ? ['SENT', 'EXHAUSTED'] : ['SENT'] },
        },
        data: delivered
          ? {
              status: 'DELIVERED',
              providerDeliveredAt: event.providerOccurredAt,
            }
          : {
              status: 'EXHAUSTED',
              lastErrorCode: `BREVO_${event.eventType}`,
              lastErrorAt: event.providerOccurredAt,
              nextAttemptAt: null,
            },
      });
      if (delivered)
        await tx.incidentNotificationDelivery.updateMany({
          where: {
            id: incidents[0].id,
            channel,
            providerMessageId: { in: ids },
            status: 'ACKNOWLEDGED',
            providerDeliveredAt: null,
          },
          data: { providerDeliveredAt: event.providerOccurredAt },
        });
    } else {
      await tx.buildingEmployee.updateMany({
        where: {
          id: employees[0].id,
          pinEmailMessageId: { in: ids },
          pinEmailStatus: {
            in: delivered ? ['ACCEPTED', 'FAILED'] : ['ACCEPTED'],
          },
        },
        data: {
          pinEmailStatus: delivered ? 'DELIVERED' : 'FAILED',
          ...(delivered
            ? { pinEmailDeliveredAt: event.providerOccurredAt }
            : {}),
        },
      });
    }
  });
}
