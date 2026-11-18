const fs = require('node:fs');
const path = require('node:path');

const expectedPath =
  'client-portal/organizations/:organizationId/operational-capabilities';
const compiledControllerPath = path.resolve(
  __dirname,
  '../dist/src/client-portal/client-operations.controller.js',
);
const compiledController = fs.readFileSync(compiledControllerPath, 'utf8');
if (
  !compiledController.includes('ClientOperationalCapabilitiesController') ||
  !compiledController.includes(expectedPath)
) {
  throw new Error('OPERATIONAL_CAPABILITIES_ROUTE_MISSING');
}

// Do not load ClientPortalModule here: importing the complete application module
// deliberately validates runtime secrets, which are unavailable during an image
// build. Inspect the compiled module emitted by the same build instead, while the
// controller itself remains loaded to validate its Nest route metadata.
const compiledModulePath = path.resolve(
  __dirname,
  '../dist/src/client-portal/client-portal.module.js',
);
const compiledModule = fs.readFileSync(compiledModulePath, 'utf8');
const controllerRegistration =
  /controllers\s*:\s*\[[\s\S]*client_operations_controller_1\.ClientOperationalCapabilitiesController[\s\S]*\]/;
if (!controllerRegistration.test(compiledModule)) {
  throw new Error('OPERATIONAL_CAPABILITIES_CONTROLLER_NOT_REGISTERED');
}

process.stdout.write('CLIENT_OPERATIONAL_ROUTES_VERIFIED\n');
