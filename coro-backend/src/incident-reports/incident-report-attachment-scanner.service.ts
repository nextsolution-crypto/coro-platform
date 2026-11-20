import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createConnection } from 'node:net';

const DEFAULT_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_SIGNATURE_AGE_HOURS = 48;

@Injectable()
export class IncidentReportAttachmentScanner {
  async scan(bytes: Buffer): Promise<'CLEAN' | 'INFECTED'> {
    if (!bytes.length) throw this.unavailable();
    const endpoint = this.endpoint();
    const version = await this.command(endpoint, 'zVERSION\0');
    this.assertCurrentSignatures(version);
    const result = await this.command(endpoint, 'zINSTREAM\0', bytes);
    if (/^stream: .+ FOUND\0?$/u.test(result)) return 'INFECTED';
    if (/^stream: OK\0?$/u.test(result)) return 'CLEAN';
    throw this.unavailable();
  }

  async ping(): Promise<void> {
    const result = await this.command(this.endpoint(), 'zPING\0');
    if (!/^PONG\0?$/u.test(result)) throw this.unavailable();
  }

  private endpoint() {
    const host = process.env.INCIDENT_REPORT_CLAMAV_HOST?.trim();
    const port = Number(
      process.env.INCIDENT_REPORT_CLAMAV_PORT ?? DEFAULT_PORT,
    );
    const timeoutMs = Number(
      process.env.INCIDENT_REPORT_CLAMAV_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS,
    );
    if (
      !host ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535 ||
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1_000 ||
      timeoutMs > 60_000
    ) {
      throw this.unavailable();
    }
    return { host, port, timeoutMs };
  }

  private command(
    endpoint: { host: string; port: number; timeoutMs: number },
    command: string,
    bytes?: Buffer,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = createConnection(endpoint);
      const chunks: Buffer[] = [];
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(this.unavailable());
      };
      socket.setTimeout(endpoint.timeoutMs, fail);
      socket.once('error', fail);
      socket.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      socket.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(Buffer.concat(chunks).toString('utf8').trim());
      });
      socket.once('connect', () => {
        socket.write(command);
        if (bytes) {
          const size = Buffer.alloc(4);
          size.writeUInt32BE(bytes.length);
          socket.write(size);
          socket.write(bytes);
          socket.write(Buffer.alloc(4));
        }
      });
    });
  }

  private assertCurrentSignatures(version: string): void {
    const match = /^ClamAV\s+[^/]+\/\d+\/(.+?)\0?$/u.exec(version);
    const timestamp = match ? Date.parse(match[1]) : Number.NaN;
    const maximumHours = Number(
      process.env.INCIDENT_REPORT_CLAMAV_MAX_SIGNATURE_AGE_HOURS ??
        DEFAULT_MAX_SIGNATURE_AGE_HOURS,
    );
    if (
      !Number.isFinite(timestamp) ||
      !Number.isInteger(maximumHours) ||
      maximumHours < 1 ||
      maximumHours > 168 ||
      timestamp > Date.now() + 60 * 60 * 1_000 ||
      Date.now() - timestamp > maximumHours * 60 * 60 * 1_000
    ) {
      throw this.unavailable();
    }
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException('Analyse antivirus indisponible.');
  }
}
