/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const dashboard = fs.readFileSync(path.join(__dirname, 'page.tsx'), 'utf8');
const appLayout = fs.readFileSync(
  path.join(__dirname, '..', '..', 'components', 'layout', 'AppLayout.tsx'),
  'utf8',
);

const fixtures = [
  {
    id: 'project-1',
    documentType: 'PCA',
    name: 'Plan Alpha',
    client: { name: 'Organisation Alpha' },
    submittedBy: { firstName: 'Ariane', lastName: 'Test' },
  },
  {
    id: 'project-2',
    documentType: 'PMU',
    name: 'Plan Beta',
    client: { name: 'Organisation Beta' },
    submittedBy: { firstName: 'Benoît', lastName: 'Test' },
  },
];

function projectPendingApprovals(items) {
  const palette = {
    bg: (value) => `bg:${value}`,
    line: (value) => `line:${value}`,
    text: (value) => `text:${value}`,
  };
  return items.map((approval) => ({
    id: approval.id,
    href: `/projects/${approval.id}`,
    documentType: approval.documentType,
    name: approval.name,
    clientName: approval.client?.name,
    submittedBy: `${approval.submittedBy?.firstName} ${approval.submittedBy?.lastName}`,
    background: palette.bg('#FFFFFF'),
    border: palette.line('#F1948A'),
    color: palette.text('#2C3E50'),
  }));
}

test('pending approvals support zero, one and multiple records without masking the palette', () => {
  assert.deepEqual(projectPendingApprovals([]), []);
  assert.equal(projectPendingApprovals(fixtures.slice(0, 1)).length, 1);
  assert.equal(projectPendingApprovals(fixtures).length, 2);
  assert.equal(projectPendingApprovals(fixtures)[1].background, 'bg:#FFFFFF');
});

test('Dashboard keeps the approval API, data and project navigation contract', () => {
  assert.match(dashboard, /api\.get\('\/projects\/pending-approval'\)/);
  assert.match(dashboard, /setPendingApprovals\(approvalsRes\.data \|\| \[\]\)/);
  assert.match(dashboard, /pendingApprovals\.map\(approval =>/);
  assert.match(dashboard, /router\.push\(`\/projects\/\$\{approval\.id\}`\)/);
  assert.match(dashboard, /approval\.documentType/);
  assert.match(dashboard, /approval\.client\?\.name/);
  assert.doesNotMatch(dashboard, /pendingApprovals\.map\(p =>/);
});

test('AppLayout keeps the same notification action and submitter projection', () => {
  assert.match(appLayout, /pendingApprovals\.map\(approval =>/);
  assert.match(appLayout, /router\.push\(`\/projects\/\$\{approval\.id\}`\); setShowNotif\(false\)/);
  assert.match(appLayout, /approval\.submittedBy\?\.firstName/);
  assert.match(appLayout, /approval\.submittedBy\?\.lastName/);
  assert.doesNotMatch(appLayout, /pendingApprovals\.map\(p =>/);
});
