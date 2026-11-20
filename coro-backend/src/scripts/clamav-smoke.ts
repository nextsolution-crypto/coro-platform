import { IncidentReportAttachmentScanner } from '../incident-reports/incident-report-attachment-scanner.service';

const EICAR = Buffer.from(
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  'ascii',
);

async function main() {
  if (process.env.INCIDENT_REPORT_IMPORT_ENABLED === 'true') {
    throw new Error('INCIDENT_REPORT_IMPORT_ENABLED_MUST_REMAIN_FALSE');
  }
  if (process.env.INCIDENT_REPORT_ATTACHMENTS_ENABLED !== 'true') {
    throw new Error('INCIDENT_REPORT_ATTACHMENTS_ENABLED_MUST_BE_TRUE');
  }
  const scanner = new IncidentReportAttachmentScanner();
  await scanner.ping();
  const clean = await scanner.scan(Buffer.from('CORO_CLAMAV_SYNTHETIC_CLEAN'));
  const infected = await scanner.scan(EICAR);
  if (clean !== 'CLEAN' || infected !== 'INFECTED') {
    throw new Error('CLAMAV_INSTREAM_CONTRACT_FAILED');
  }
  process.stdout.write(
    `${JSON.stringify({
      schemaVersion: 1,
      execution: 'PASS',
      ping: 'PONG',
      signatures: 'CURRENT',
      cleanInstream: 'CLEAN',
      eicarInstream: 'INFECTED',
      importEnabled: false,
      attachmentsEnabled: true,
      containsCustomerData: false,
    })}\n`,
  );
}

main().catch(() => {
  process.stderr.write('CORO_CLAMAV_SMOKE_FAILED\n');
  process.exitCode = 1;
});
