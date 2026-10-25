import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private static readonly OFFICIAL_PDF_REFERENCE_PREFIX = 'coro-private:v1:';
  private static readonly MAX_OFFICIAL_PDF_BYTES = 50 * 1024 * 1024;
  private readonly logger = new Logger(StorageService.name);
  private readonly endpoint =
    process.env.DO_SPACES_ENDPOINT || 'https://tor1.digitaloceanspaces.com';
  private readonly bucket = process.env.DO_SPACES_BUCKET || 'coro-storage';
  private readonly accessKey = process.env.DO_SPACES_KEY || '';
  private readonly secretKey = process.env.DO_SPACES_SECRET || '';
  private readonly cdnUrl =
    process.env.DO_SPACES_CDN_URL ||
    'https://coro-storage.tor1.digitaloceanspaces.com';
  private readonly privateStorage = this.resolvePrivateStorage();

  private resolvePrivateStorage() {
    const qaMode = process.env.PRIVATE_STORAGE_QA_MODE === 'true';
    if (!qaMode) {
      return {
        protocol: 'https:' as const,
        hostname: `${this.bucket}.tor1.digitaloceanspaces.com`,
        port: undefined,
        pathPrefix: '',
        bucket: this.bucket,
        accessKey: this.accessKey,
        secretKey: this.secretKey,
        region: 'tor1',
      };
    }

    const endpoint = process.env.PRIVATE_STORAGE_QA_ENDPOINT?.trim();
    const accessKey = process.env.PRIVATE_STORAGE_QA_ACCESS_KEY?.trim();
    const secretKey = process.env.PRIVATE_STORAGE_QA_SECRET_KEY?.trim();
    const bucket = process.env.PRIVATE_STORAGE_QA_BUCKET?.trim();
    if (!endpoint || !accessKey || !secretKey || !bucket) {
      throw new Error(
        'PRIVATE_STORAGE_QA_MODE requires PRIVATE_STORAGE_QA_ENDPOINT, PRIVATE_STORAGE_QA_ACCESS_KEY, PRIVATE_STORAGE_QA_SECRET_KEY and PRIVATE_STORAGE_QA_BUCKET.',
      );
    }
    const url = new URL(endpoint);
    const localHosts = new Set([
      '127.0.0.1',
      '::1',
      'localhost',
      'minio',
      'private-storage-qa',
    ]);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      !localHosts.has(url.hostname) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        'PRIVATE_STORAGE_QA_ENDPOINT must be an explicit local HTTP(S) endpoint without credentials, query or fragment.',
      );
    }
    if (
      accessKey === this.accessKey ||
      secretKey === this.secretKey ||
      bucket === this.bucket
    ) {
      throw new Error(
        'QA private storage credentials and bucket must be isolated from production storage configuration.',
      );
    }
    return {
      protocol: url.protocol as 'http:' | 'https:',
      hostname: url.hostname,
      port: url.port ? Number(url.port) : undefined,
      pathPrefix: url.pathname.replace(/\/$/, ''),
      bucket,
      accessKey,
      secretKey,
      region: 'us-east-1',
    };
  }

  private hmac(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  private getSignatureKey(
    dateStamp: string,
    region: string,
    service: string,
  ): Buffer {
    const kDate = this.hmac('AWS4' + this.secretKey, dateStamp);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    const kSigning = this.hmac(kService, 'aws4_request');
    return kSigning;
  }

  private privateRequest(
    method: 'PUT' | 'GET',
    key: string,
    body?: Buffer,
    contentType = 'application/octet-stream',
  ): Promise<Buffer> {
    const config = this.privateStorage;
    const host = config.port
      ? `${config.hostname}:${config.port}`
      : config.hostname;
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const path = config.pathPrefix
      ? `${config.pathPrefix}/${config.bucket}/${encodedKey}`
      : config.protocol === 'https:' && config.region === 'tor1'
        ? `/${encodedKey}`
        : `/${config.bucket}/${encodedKey}`;
    const now = new Date();
    const amzDate =
      now
        .toISOString()
        .replace(/[:-]|\.\d{3}/g, '')
        .substring(0, 15) + 'Z';
    const dateStamp = amzDate.substring(0, 8);
    const payload = body ?? Buffer.alloc(0);
    const payloadHash = crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
    const headers: Record<string, string> = {
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };
    if (method === 'PUT') {
      headers['content-type'] = contentType;
    }
    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders = Object.keys(headers)
      .sort()
      .map((name) => `${name}:${headers[name]}\n`)
      .join('');
    const canonicalRequest = [
      method,
      path,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    const signature = crypto
      .createHmac(
        'sha256',
        this.getSignatureKeyFor(
          config.secretKey,
          dateStamp,
          config.region,
          's3',
        ),
      )
      .update(stringToSign)
      .digest('hex');
    const requestHeaders: Record<string, string | number> = {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
    if (method === 'PUT') requestHeaders['Content-Length'] = payload.length;

    return new Promise((resolve, reject) => {
      const transport = config.protocol === 'http:' ? http : https;
      const req = transport.request(
        {
          hostname: config.hostname,
          port: config.port,
          path,
          method,
          headers: requestHeaders,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          res.on('end', () => {
            const response = Buffer.concat(chunks);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300)
              return resolve(response);
            if (method === 'GET' && res.statusCode === 404)
              return reject(new Error('PRIVATE_OBJECT_NOT_FOUND'));
            reject(
              new Error(`Private storage ${method} failed: ${res.statusCode}`),
            );
          });
        },
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  private getSignatureKeyFor(
    secretKey: string,
    dateStamp: string,
    region: string,
    service: string,
  ): Buffer {
    const kDate = this.hmac('AWS4' + secretKey, dateStamp);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    return this.hmac(kService, 'aws4_request');
  }

  async uploadPrivateImmutable(
    fileBuffer: Buffer,
    storageKey: string,
    contentType: string,
  ): Promise<{ storageKey: string }> {
    try {
      await this.downloadPrivate(storageKey);
      throw new Error('PRIVATE_OBJECT_ALREADY_EXISTS');
    } catch (error: unknown) {
      if (
        !(error instanceof Error) ||
        error.message !== 'PRIVATE_OBJECT_NOT_FOUND'
      )
        throw error;
    }

    await this.privateRequest('PUT', storageKey, fileBuffer, contentType);

    const stored = await this.downloadPrivate(storageKey);
    const expectedHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');
    const storedHash = crypto.createHash('sha256').update(stored).digest('hex');
    if (stored.length !== fileBuffer.length || storedHash !== expectedHash) {
      throw new Error('PRIVATE_OBJECT_WRITE_VERIFICATION_FAILED');
    }

    this.logger.log(`Private evidence object stored: ${storageKey}`);
    return { storageKey };
  }

  async downloadPrivate(storageKey: string): Promise<Buffer> {
    return this.privateRequest('GET', storageKey);
  }

  async storeOfficialPdfImmutable(input: {
    organizationId: string;
    projectId: string;
    projectVersionId: string;
    language: 'fr' | 'en';
    bytes: Buffer;
  }): Promise<string> {
    this.assertPdf(input.bytes);
    const storageKey = [
      `tenant-${this.safeKeyPart(input.organizationId)}`,
      'official-project-pdfs',
      this.safeKeyPart(input.projectId),
      this.safeKeyPart(input.projectVersionId),
      `${input.language}.pdf`,
    ].join('/');

    try {
      const existing = await this.downloadPrivate(storageKey);
      if (!this.buffersEqual(existing, input.bytes)) {
        throw new Error('OFFICIAL_PDF_IMMUTABLE_CONFLICT');
      }
    } catch (error: unknown) {
      if (
        !(error instanceof Error) ||
        error.message !== 'PRIVATE_OBJECT_NOT_FOUND'
      ) {
        throw error;
      }
      try {
        await this.uploadPrivateImmutable(
          input.bytes,
          storageKey,
          'application/pdf',
        );
      } catch (uploadError: unknown) {
        if (
          !(uploadError instanceof Error) ||
          uploadError.message !== 'PRIVATE_OBJECT_ALREADY_EXISTS'
        ) {
          throw uploadError;
        }
        const racedObject = await this.downloadPrivate(storageKey);
        if (!this.buffersEqual(racedObject, input.bytes)) {
          throw new Error('OFFICIAL_PDF_IMMUTABLE_CONFLICT');
        }
      }
    }

    return `${StorageService.OFFICIAL_PDF_REFERENCE_PREFIX}${Buffer.from(
      storageKey,
      'utf8',
    ).toString('base64url')}`;
  }

  async downloadOfficialPdfReference(reference: string): Promise<Buffer> {
    const prefix = StorageService.OFFICIAL_PDF_REFERENCE_PREFIX;
    let bytes: Buffer;
    if (reference.startsWith(prefix)) {
      const encoded = reference.slice(prefix.length);
      if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) {
        throw new Error('INVALID_PRIVATE_OFFICIAL_PDF_REFERENCE');
      }
      const storageKey = Buffer.from(encoded, 'base64url').toString('utf8');
      if (
        !/^tenant-[A-Za-z0-9._-]+\/official-project-pdfs\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\/(fr|en)\.pdf$/.test(
          storageKey,
        )
      ) {
        throw new Error('INVALID_PRIVATE_OFFICIAL_PDF_REFERENCE');
      }
      bytes = await this.downloadPrivate(storageKey);
    } else {
      bytes = await this.downloadHistoricalOfficialPdf(reference);
    }
    this.assertPdf(bytes);
    return bytes;
  }

  private async downloadHistoricalOfficialPdf(
    reference: string,
  ): Promise<Buffer> {
    let candidate: URL;
    let allowedOrigin: URL;
    try {
      candidate = new URL(reference);
      allowedOrigin = new URL(this.cdnUrl);
    } catch {
      throw new Error('UNSUPPORTED_HISTORICAL_OFFICIAL_PDF_REFERENCE');
    }
    if (
      candidate.protocol !== 'https:' ||
      candidate.origin !== allowedOrigin.origin ||
      candidate.username ||
      candidate.password ||
      candidate.search ||
      candidate.hash ||
      !candidate.pathname.startsWith('/documents/')
    ) {
      throw new Error('UNSUPPORTED_HISTORICAL_OFFICIAL_PDF_REFERENCE');
    }

    const storageKey = candidate.pathname
      .slice(1)
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .join('/');
    if (!storageKey || storageKey.includes('..') || storageKey.includes('\\')) {
      throw new Error('UNSUPPORTED_HISTORICAL_OFFICIAL_PDF_REFERENCE');
    }
    return this.downloadPrivate(storageKey);
  }

  private safeKeyPart(value: string): string {
    if (!/^[A-Za-z0-9._-]+$/.test(value)) {
      throw new Error('INVALID_OFFICIAL_PDF_STORAGE_ID');
    }
    return value;
  }

  private buffersEqual(left: Buffer, right: Buffer): boolean {
    if (left.length !== right.length) return false;
    const leftHash = crypto.createHash('sha256').update(left).digest();
    const rightHash = crypto.createHash('sha256').update(right).digest();
    return crypto.timingSafeEqual(leftHash, rightHash);
  }

  private assertPdf(bytes: Buffer): void {
    if (
      bytes.length < 5 ||
      bytes.length > StorageService.MAX_OFFICIAL_PDF_BYTES ||
      bytes.subarray(0, 5).toString('ascii') !== '%PDF-'
    ) {
      throw new Error('INVALID_OFFICIAL_PDF');
    }
  }

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folder: string,
    contentType: string,
  ): Promise<string> {
    const key = `${folder}/${fileName}`;
    const host = `${this.bucket}.tor1.digitaloceanspaces.com`;
    const now = new Date();
    const amzDate =
      now
        .toISOString()
        .replace(/[:-]|\.\d{3}/g, '')
        .substring(0, 15) + 'Z';
    const dateStamp = amzDate.substring(0, 8);
    const region = 'tor1';
    const service = 's3';

    const payloadHash = crypto
      .createHash('sha256')
      .update(fileBuffer)
      .digest('hex');

    const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'PUT',
      `/${key}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = this.getSignatureKey(dateStamp, region, service);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return new Promise((resolve, reject) => {
      const endpointUrl = new URL(`https://${host}/${key}`);
      const options = {
        hostname: endpointUrl.hostname,
        path: endpointUrl.pathname,
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length,
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
          'x-amz-acl': 'public-read',
          Authorization: authorization,
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          const publicUrl = `${this.cdnUrl}/${key}`;
          this.logger.log(`File uploaded: ${publicUrl}`);
          resolve(publicUrl);
        } else {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () =>
            reject(new Error(`Upload failed: ${res.statusCode} - ${body}`)),
          );
        }
      });

      req.on('error', reject);
      req.write(fileBuffer);
      req.end();
    });
  }

  async deleteFile(fileName: string, folder: string): Promise<void> {
    const key = `${folder}/${fileName}`;
    const host = `${this.bucket}.tor1.digitaloceanspaces.com`;
    const now = new Date();
    const amzDate =
      now
        .toISOString()
        .replace(/[:-]|\.\d{3}/g, '')
        .substring(0, 15) + 'Z';
    const dateStamp = amzDate.substring(0, 8);
    const region = 'tor1';
    const service = 's3';

    const payloadHash = crypto.createHash('sha256').update('').digest('hex');
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
      'DELETE',
      `/${key}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');
    const signingKey = this.getSignatureKey(dateStamp, region, service);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        path: `/${key}`,
        method: 'DELETE',
        headers: {
          'x-amz-content-sha256': payloadHash,
          'x-amz-date': amzDate,
          Authorization: authorization,
        },
      };

      const req = https.request(options, (res) => {
        if (res.statusCode === 204 || res.statusCode === 200) resolve();
        else reject(new Error(`Delete failed: ${res.statusCode}`));
      });

      req.on('error', reject);
      req.end();
    });
  }

  getPublicUrl(fileName: string, folder: string): string {
    return `${this.cdnUrl}/${folder}/${fileName}`;
  }
}
