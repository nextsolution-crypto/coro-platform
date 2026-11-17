import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createConnection } from 'node:net';

@Injectable()
export class IncidentReportAttachmentScanner {
  async scan(bytes: Buffer): Promise<'CLEAN' | 'INFECTED'> {
    const host = process.env.INCIDENT_REPORT_CLAMAV_HOST?.trim();
    const port = Number(process.env.INCIDENT_REPORT_CLAMAV_PORT ?? 3310);
    if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ServiceUnavailableException('Analyse antivirus indisponible.');
    }
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });
      const chunks: Buffer[] = [];
      const fail = () =>
        reject(
          new ServiceUnavailableException('Analyse antivirus indisponible.'),
        );
      socket.setTimeout(15_000, () => {
        socket.destroy();
        fail();
      });
      socket.once('error', fail);
      socket.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      socket.on('end', () => {
        const result = Buffer.concat(chunks).toString('utf8');
        if (result.includes('FOUND')) return resolve('INFECTED');
        if (result.includes('OK')) return resolve('CLEAN');
        fail();
      });
      socket.once('connect', () => {
        socket.write('zINSTREAM\0');
        const size = Buffer.alloc(4);
        size.writeUInt32BE(bytes.length);
        socket.write(size);
        socket.write(bytes);
        socket.write(Buffer.alloc(4));
      });
    });
  }
}
