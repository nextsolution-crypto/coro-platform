const { MODULE_METADATA, PATH_METADATA } = require('@nestjs/common/constants');
const {
  ClientOperationalCapabilitiesController,
} = require('../dist/src/client-portal/client-operations.controller.js');
const {
  ClientPortalModule,
} = require('../dist/src/client-portal/client-portal.module.js');

const expectedPath =
  'client-portal/organizations/:organizationId/operational-capabilities';
const actualPath = Reflect.getMetadata(
  PATH_METADATA,
  ClientOperationalCapabilitiesController,
);
if (actualPath !== expectedPath) {
  throw new Error(`OPERATIONAL_CAPABILITIES_ROUTE_MISSING:${actualPath ?? ''}`);
}

const controllers =
  Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ClientPortalModule) ?? [];
if (!controllers.includes(ClientOperationalCapabilitiesController)) {
  throw new Error('OPERATIONAL_CAPABILITIES_CONTROLLER_NOT_REGISTERED');
}

process.stdout.write('CLIENT_OPERATIONAL_ROUTES_VERIFIED\n');
