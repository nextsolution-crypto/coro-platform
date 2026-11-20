import { ServiceUnavailableException } from '@nestjs/common';
import { createServer, Server, Socket } from 'node:net';
import { IncidentReportAttachmentScanner } from './incident-report-attachment-scanner.service';

describe('IncidentReportAttachmentScanner', () => {
  let server: Server;
  let sockets: Socket[];
  let port: number;
  const prior = { ...process.env };

  async function listen(handler: (socket: Socket, command: Buffer) => void) {
    sockets = [];
    server = createServer((socket) => {
      sockets.push(socket);
      socket.once('data', (command) => handler(socket, command));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as { port: number }).port;
    process.env.INCIDENT_REPORT_CLAMAV_HOST = '127.0.0.1';
    process.env.INCIDENT_REPORT_CLAMAV_PORT = String(port);
    process.env.INCIDENT_REPORT_CLAMAV_TIMEOUT_MS = '1000';
    process.env.INCIDENT_REPORT_CLAMAV_MAX_SIGNATURE_AGE_HOURS = '48';
  }

  afterEach(async () => {
    for (const socket of sockets ?? []) socket.destroy();
    if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
    process.env = { ...prior };
    jest.useRealTimers();
  });

  it('accepts a clean stream only after a current signature version', async () => {
    await listen((socket, command) => {
      if (command.toString().startsWith('zVERSION')) {
        socket.end(`ClamAV 1.5.4/12345/${new Date().toUTCString()}\0`);
      } else {
        socket.end('stream: OK\0');
      }
    });
    await expect(
      new IncidentReportAttachmentScanner().scan(Buffer.from('clean')),
    ).resolves.toBe('CLEAN');
  });

  it('detects EICAR-style infected responses', async () => {
    await listen((socket, command) => {
      if (command.toString().startsWith('zVERSION')) {
        socket.end(`ClamAV 1.5.4/12345/${new Date().toUTCString()}\0`);
      } else {
        socket.end('stream: Win.Test.EICAR_HDB-1 FOUND\0');
      }
    });
    await expect(
      new IncidentReportAttachmentScanner().scan(Buffer.from('synthetic')),
    ).resolves.toBe('INFECTED');
  });

  it.each([
    ['missing configuration', undefined, undefined],
    ['invalid port', '127.0.0.1', '0'],
  ])('fails closed for %s', async (_case, host, configuredPort) => {
    process.env.INCIDENT_REPORT_CLAMAV_HOST = host;
    process.env.INCIDENT_REPORT_CLAMAV_PORT = configuredPort;
    await expect(
      new IncidentReportAttachmentScanner().scan(Buffer.from('clean')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed when signatures are stale', async () => {
    await listen((socket) => {
      socket.end(
        `ClamAV 1.5.4/12345/${new Date(Date.now() - 72 * 60 * 60 * 1000).toUTCString()}\0`,
      );
    });
    await expect(
      new IncidentReportAttachmentScanner().scan(Buffer.from('clean')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed for malformed daemon responses', async () => {
    await listen((socket) => socket.end('unexpected\0'));
    await expect(
      new IncidentReportAttachmentScanner().scan(Buffer.from('clean')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('fails closed on timeout', async () => {
    await listen(() => undefined);
    await expect(
      new IncidentReportAttachmentScanner().scan(Buffer.from('clean')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
