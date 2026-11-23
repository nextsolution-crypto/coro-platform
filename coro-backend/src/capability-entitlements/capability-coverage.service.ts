import { Injectable } from '@nestjs/common';
import { CapabilityCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementResolver } from './entitlement-resolver.service';
import { capabilityEnforcementMode } from './family-entitlement';

/**
 * M8-07 — Fonctions actives par client, comparées à ce que promet le site.
 *
 * Chaque offre vendable est rattachée à ses codes de droits d'accès et à sa
 * page publique (ou à son absence). Le rapport dit, pour chaque client et
 * chaque bâtiment, ce qui est réellement actif, et signale les écarts :
 * une offre promise sur le site sans aucun client actif, ou une fonction
 * active chez un client sans page publique qui la décrive.
 */
export interface CoverageOffer {
  key: string;
  label: string;
  codes: CapabilityCode[];
  /** Page publique de getcoro.io qui présente l'offre, ou null. */
  siteRoute: string | null;
  /** Variables techniques qui doivent être actives sur le serveur. */
  technicalFlags?: string[];
}

export interface CoverageBuilding {
  id: string;
  name: string;
  offers: Record<string, boolean>;
}
export interface CoverageClient extends CoverageBuilding {
  buildings: CoverageBuilding[];
}

export const COVERAGE_OFFERS: CoverageOffer[] = [
  { key: 'SENTINELLE', label: 'CORO Sentinelle (présence, évacuation)', codes: ['SENTINELLE'], siteRoute: '/sentinelle' },
  { key: 'SENTINELLE_POPULATION', label: 'Sentinelle Population', codes: ['SENTINELLE_POPULATION'], siteRoute: '/sentinelle-population' },
  { key: 'INCIDENT', label: 'CORO Incident (urgences)', codes: ['INCIDENT'], siteRoute: '/coro-incident' },
  {
    key: 'SECURITY_WORKSTATION',
    label: 'Poste de sécurité (CORO Report, main courante)',
    codes: ['SECURITY_WORKSTATION', 'INCIDENT_REPORTS'],
    siteRoute: null,
    technicalFlags: ['INCIDENT_REPORTS_ENABLED', 'OPERATIONAL_LOG_ENABLED'],
  },
  { key: 'KNOWLEDGE', label: 'CORO Knowledge', codes: ['KNOWLEDGE'], siteRoute: '/coro-knowledge' },
  { key: 'AI', label: 'CORO AI', codes: ['AI'], siteRoute: '/coro-ai' },
  { key: 'NETWORK', label: 'CORO Network (multi-sites)', codes: ['NETWORK'], siteRoute: null },
  { key: 'PERFORMANCE', label: 'Performance', codes: ['PERFORMANCE'], siteRoute: '/performance-objectifs' },
];

type Resolution = Awaited<ReturnType<EntitlementResolver['resolve']>>;
const effective = (resolution: Resolution | null) =>
  Boolean(
    resolution?.availability.isAvailable &&
      resolution.licensed &&
      resolution.enabled &&
      resolution.effectiveState === 'EFFECTIVE',
  );

@Injectable()
export class CapabilityCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: EntitlementResolver,
  ) {}

  private async active(
    organizationId: string,
    code: CapabilityCode,
    scope: { clientId?: string; buildingId?: string },
  ): Promise<boolean> {
    try {
      return effective(await this.resolver.resolve({ organizationId, capabilityCode: code, ...scope }));
    } catch {
      // Code absent du catalogue commercial : jamais actif.
      return false;
    }
  }

  async coverage(organizationId: string) {
    const clients = await this.prisma.client.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        buildings: {
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    const organizationLevel: Record<string, boolean> = {};
    for (const offer of COVERAGE_OFFERS)
      organizationLevel[offer.key] = (
        await Promise.all(offer.codes.map((code) => this.active(organizationId, code, {})))
      ).some(Boolean);

    const rows: CoverageClient[] = [];
    for (const client of clients) {
      const clientLevel: Record<string, boolean> = {};
      for (const offer of COVERAGE_OFFERS)
        clientLevel[offer.key] =
          organizationLevel[offer.key] ||
          (await Promise.all(offer.codes.map((code) => this.active(organizationId, code, { clientId: client.id })))).some(Boolean);
      const buildings: CoverageBuilding[] = [];
      for (const building of client.buildings) {
        const offers: Record<string, boolean> = {};
        for (const offer of COVERAGE_OFFERS)
          offers[offer.key] =
            clientLevel[offer.key] ||
            (
              await Promise.all(
                offer.codes.map((code) =>
                  this.active(organizationId, code, { clientId: client.id, buildingId: building.id }),
                ),
              )
            ).some(Boolean);
        buildings.push({ id: building.id, name: building.name, offers });
      }
      rows.push({ id: client.id, name: client.name, offers: clientLevel, buildings });
    }

    const technical = Object.fromEntries(
      COVERAGE_OFFERS.map((offer) => [
        offer.key,
        (offer.technicalFlags ?? []).every((flag) => process.env[flag] === 'true'),
      ]),
    );
    const activeAnywhere = (key: string) =>
      rows.some((client) => client.offers[key] || client.buildings.some((building) => building.offers[key]));
    const gaps = COVERAGE_OFFERS.flatMap((offer) => {
      const found: Array<{ offer: string; kind: string; message: string }> = [];
      if (offer.siteRoute && !activeAnywhere(offer.key))
        found.push({
          offer: offer.key,
          kind: 'PROMISED_NOT_ACTIVE',
          message: `Présenté sur le site (${offer.siteRoute}) mais actif chez aucun client.`,
        });
      if (!offer.siteRoute && activeAnywhere(offer.key))
        found.push({
          offer: offer.key,
          kind: 'ACTIVE_NOT_ON_SITE',
          message: 'Actif chez au moins un client mais présenté sur aucune page du site.',
        });
      if (offer.technicalFlags?.length && activeAnywhere(offer.key) && !technical[offer.key])
        found.push({
          offer: offer.key,
          kind: 'LICENSED_NOT_DEPLOYED',
          message: 'Vendu à un client, mais désactivé techniquement sur le serveur.',
        });
      return found;
    });

    return {
      generatedAt: new Date().toISOString(),
      enforcementMode: capabilityEnforcementMode(),
      offers: COVERAGE_OFFERS.map(({ key, label, siteRoute }) => ({
        key,
        label,
        siteRoute,
        technicallyEnabled: technical[key],
      })),
      clients: rows,
      gaps,
    };
  }
}
