const { PrismaClient, CoroActorType, IncidentPermission, PlatformPermission, PlatformPermissionScope, UserRole } = require('../../coro-backend/node_modules/@prisma/client');
const bcrypt = require('../../coro-backend/node_modules/bcryptjs');
const { createHash } = require('node:crypto');

const prisma = new PrismaClient();

function assertQaTarget(environment = process.env) {
  if (environment.NODE_ENV === 'production') throw new Error('QA seed is forbidden in production.');
  if (environment.INC_RP_QA_CONFIRM !== 'SYNTHETIC_LOCAL_ONLY')
    throw new Error('INC_RP_QA_CONFIRM=SYNTHETIC_LOCAL_ONLY is required.');
  const raw = environment.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is required.');
  const url = new URL(raw);
  const database = decodeURIComponent(url.pathname.slice(1));
  const user = decodeURIComponent(url.username);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['127.0.0.1', 'localhost', '::1'].includes(url.hostname) ||
    url.port !== '55433' ||
    database !== 'coro_report_qa' ||
    user !== 'coro_report_qa'
  ) throw new Error('QA seed requires the isolated local CORO Report database.');
}
const ids = {
  organization: '71000000-0000-4000-8000-000000000001', client: '71000000-0000-4000-8000-000000000002', building: '71000000-0000-4000-8000-000000000003',
  agent: '71000000-0000-4000-8000-000000000011', supervisor: '71000000-0000-4000-8000-000000000012', unauthorized: '71000000-0000-4000-8000-000000000013', admin: '71000000-0000-4000-8000-000000000014',
};
const users = [
  [ids.agent, 'agent@report-qa.test', 'Alex', 'Agent', UserRole.OPERATOR],
  [ids.supervisor, 'supervisor@report-qa.test', 'Sam', 'Superviseur', UserRole.ADMIN],
  [ids.unauthorized, 'sans-acces@report-qa.test', 'Noa', 'Sans accès', UserRole.OPERATOR],
  [ids.admin, 'admin@report-qa.test', 'Morgan', 'Administrateur', UserRole.ADMIN],
];
const templates = [
  ['GENERAL_INCIDENT', 'Rapport général d’incident'], ['DAILY_ACTIVITY', 'Rapport d’activité quotidienne'],
  ['TECHNICAL_ANOMALY', 'Rapport d’anomalie technique'], ['SECURITY_INTERVENTION', 'Rapport d’intervention de sécurité'],
  ['COMPLAINT', 'Rapport de plainte'], ['ACCIDENT', 'Rapport d’accident'],
  ['PROPERTY_DAMAGE', 'Rapport de dommages matériels'], ['UNUSUAL_SITUATION', 'Rapport de situation inhabituelle'],
];
const formSchema = { schemaVersion: '1.0', sections: [
  { key: 'identification', title: 'Identification', fields: [
    { key: 'occurredAt', label: 'Date et heure', type: 'DATETIME', required: true, source: 'CORO' },
    { key: 'location', label: 'Lieu', type: 'ROOM', required: true, source: 'CORO' },
    { key: 'summary', label: 'Résumé', type: 'LONG_TEXT', required: true, source: 'CORO' },
    { key: 'policeCalled', label: 'Service policier appelé', type: 'CHECKBOX', source: 'CORO' },
    { key: 'policeFileNumber', label: 'Numéro de dossier policier', type: 'SHORT_TEXT', visibleWhen: { fieldKey: 'policeCalled', operator: 'EQ', value: true }, source: 'CORO' },
  ] },
  { key: 'people', title: 'Personnes et témoins', fields: [{ key: 'people', label: 'Personnes', type: 'REPEATABLE_SECTION', maxItems: 50, children: [
    { key: 'name', label: 'Nom fictif', type: 'SHORT_TEXT', required: true },
    { key: 'role', label: 'Rôle', type: 'SELECT', options: ['PERSON', 'WITNESS', 'RESPONDER'].map(value => ({ value, label: value })) },
  ] }] },
  { key: 'vehicles', title: 'Véhicules', fields: [{ key: 'vehicles', label: 'Véhicules', type: 'REPEATABLE_SECTION', maxItems: 20, children: [
    { key: 'plate', label: 'Plaque fictive', type: 'SHORT_TEXT', required: true }, { key: 'description', label: 'Description', type: 'SHORT_TEXT' },
  ] }] },
] };

async function main() {
  assertQaTarget();
  const password = process.env.INC_RP_QA_PASSWORD;
  if (!password || password.length < 12) throw new Error('INC_RP_QA_PASSWORD (12+ chars) is required.');
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.organization.upsert({ where: { id: ids.organization }, update: { isActive: true }, create: { id: ids.organization, name: 'Immeubles Boréal — QA synthétique', isActive: true } });
  await prisma.client.upsert({ where: { id: ids.client }, update: { isActive: true }, create: { id: ids.client, organizationId: ids.organization, name: 'Gestion Boréal fictive', regulatoryRequirements: [], isActive: true } });
  await prisma.building.upsert({ where: { id: ids.building }, update: { isActive: true }, create: { id: ids.building, organizationId: ids.organization, clientId: ids.client, name: 'Édifice Horizon QA', address: '100 rue Exemple', city: 'Montréal', province: 'QC', postalCode: 'H0H 0H0', isActive: true } });
  for (const [id, email, firstName, lastName, role] of users) await prisma.user.upsert({ where: { id }, update: { password: passwordHash, isActive: true }, create: { id, email, password: passwordHash, firstName, lastName, role, organizationId: ids.organization, isActive: true } });
  for (const [id] of users) await prisma.project.upsert({ where: { id: `72000000-0000-4000-8000-${id.slice(-12)}` }, update: { userId: id, isActive: true }, create: { id: `72000000-0000-4000-8000-${id.slice(-12)}`, name: `Accès QA ${id.slice(-2)}`, documentType: 'PMU', year: 2026, organizationId: ids.organization, clientId: ids.client, buildingId: ids.building, userId: id, isActive: true } });

  await prisma.incidentReportTemplateVersion.deleteMany({ where: { organizationId: ids.organization } });
  await prisma.incidentReportRetentionPolicy.deleteMany({ where: { organizationId: ids.organization } });
  for (let index = 0; index < templates.length; index += 1) {
    const [templateKey, name] = templates[index]; const canonical = JSON.stringify({ formSchema, fieldCatalog: {}, mappingMetadata: null });
    await prisma.incidentReportTemplateVersion.create({ data: { id: `73000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, organizationId: ids.organization, templateKey, version: 1, name, reportType: templateKey, status: 'PUBLISHED', schemaVersion: '1.0', formSchema, fieldCatalog: {}, contentHash: createHash('sha256').update(canonical).digest('hex'), publishedAt: new Date(), createdByActorType: CoroActorType.SYSTEM, createdByActorId: ids.admin } });
    await prisma.incidentReportRetentionPolicy.create({ data: { id: `74000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, organizationId: ids.organization, reportType: templateKey, retainForDays: 365, createdByActorType: CoroActorType.SYSTEM, createdByActorId: ids.admin } });
  }
  await prisma.platformPermissionGrant.deleteMany({ where: { targetOrganizationId: ids.organization, userId: { in: [ids.agent, ids.supervisor, ids.admin] }, permission: { in: Object.values(PlatformPermission).filter(value => value.startsWith('INCIDENT_REPORT_')) } } });
  const grants = {
    [ids.agent]: [PlatformPermission.INCIDENT_REPORT_READ, PlatformPermission.INCIDENT_REPORT_CREATE, PlatformPermission.INCIDENT_REPORT_EDIT],
    [ids.supervisor]: [PlatformPermission.INCIDENT_REPORT_READ, PlatformPermission.INCIDENT_REPORT_REVIEW, PlatformPermission.INCIDENT_REPORT_APPROVE],
    [ids.admin]: Object.values(PlatformPermission).filter(value => value.startsWith('INCIDENT_REPORT_')),
  };
  for (const [userId, permissions] of Object.entries(grants)) for (const permission of permissions) await prisma.platformPermissionGrant.create({ data: { userId, permission, scope: PlatformPermissionScope.ORGANIZATION, targetOrganizationId: ids.organization, grantedByUserId: ids.admin, grantReason: 'Recette synthétique INC-RP-01' } });
  await prisma.incidentAuthorityAssignment.deleteMany({ where: { organizationId: ids.organization, buildingId: ids.building, subjectId: { in: [ids.agent, ids.supervisor, ids.admin] } } });
  for (const subjectId of [ids.agent, ids.supervisor, ids.admin]) await prisma.incidentAuthorityAssignment.create({ data: { organizationId: ids.organization, buildingId: ids.building, subjectType: CoroActorType.USER, subjectId, operationalRole: 'REPORT_QA', permissions: [IncidentPermission.INCIDENT_READ], grantedByType: CoroActorType.SYSTEM, grantedById: ids.admin, grantReason: 'Recette synthétique INC-RP-01' } });
  console.log(JSON.stringify({ organizationId: ids.organization, buildingId: ids.building, accounts: users.map(([, email, firstName, lastName, role]) => ({ email, name: `${firstName} ${lastName}`, role })) }, null, 2));
}
if (require.main === module) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}

module.exports = { assertQaTarget };
