import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const presence = await readFile(new URL('./[kioskToken]/page.tsx', import.meta.url), 'utf8');
const kiosk = await readFile(new URL('../kiosk/[token]/page.tsx', import.meta.url), 'utf8');
const controller = await readFile(new URL('../../../coro-backend/src/occupancy/occupancy-employees.controller.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../../../coro-backend/prisma/migrations/20261109010000_sentinelle_presence_sessions/migration.sql', import.meta.url), 'utf8');

test('kiosk uses a server-issued rotating QR instead of a static kiosk bearer', () => {
  assert.match(kiosk, /presence\/challenge/);
  assert.match(kiosk, /setInterval\(generateQr, 30000\)/);
  assert.match(kiosk, /challenge\.sessionId/);
  assert.doesNotMatch(kiosk, /presenceUrl = `\$\{window\.location\.origin\}\/presence\/\$\{kioskToken\}`/);
});

test('phone flow separates identification from an explicit action confirmation', () => {
  assert.match(presence, /presence\/session\/start/);
  assert.match(presence, /presence\/session\/identify/);
  assert.match(presence, /presence\/session\/confirm/);
  assert.match(presence, /Confirmer mon/);
  assert.match(presence, /idempotencyKey/);
  assert.doesNotMatch(presence, /localStorage/);
});

test('remembered phone uses an HttpOnly server cookie and offers revocation', () => {
  assert.match(controller, /httpOnly: true/);
  assert.match(controller, /sameSite: 'strict'/);
  assert.match(controller, /presence\/device\/forget/);
  assert.equal(
    presence.match(/onClick=\{\(\) => void forget\(\)\}/g)?.length,
    2,
    'both "not me" and explicit forget must revoke the remembered identity',
  );
  assert.match(presence, /Oublier ce téléphone/);
});

test('legacy static PIN mutation is closed and PostgreSQL enforces one open presence', () => {
  assert.match(controller, /Ce parcours a été remplacé/);
  assert.match(migration, /OccupancyRecord_one_open_employee_idx/);
  assert.match(migration, /WHERE "employeeId" IS NOT NULL AND "status" = 'IN'/);
});
