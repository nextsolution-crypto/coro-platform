import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';
import * as crypto from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly endpoint = process.env.DO_SPACES_ENDPOINT || 'https://tor1.digitaloceanspaces.com';
  private readonly bucket = process.env.DO_SPACES_BUCKET || 'coro-storage';
  private readonly accessKey = process.env.DO_SPACES_KEY || '';
  private readonly secretKey = process.env.DO_SPACES_SECRET || '';
  private readonly cdnUrl = process.env.DO_SPACES_CDN_URL || 'https://coro-storage.tor1.digitaloceanspaces.com';

  private hmac(key: Buffer | string, data: string): Buffer {
    return crypto.createHmac('sha256', key).update(data).digest();
  }

  private getSignatureKey(dateStamp: string, region: string, service: string): Buffer {
    const kDate = this.hmac('AWS4' + this.secretKey, dateStamp);
    const kRegion = this.hmac(kDate, region);
    const kService = this.hmac(kRegion, service);
    const kSigning = this.hmac(kService, 'aws4_request');
    return kSigning;
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
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').substring(0, 15) + 'Z';
    const dateStamp = amzDate.substring(0, 8);
    const region = 'tor1';
    const service = 's3';

    const payloadHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

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
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

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
          res.on('end', () => reject(new Error(`Upload failed: ${res.statusCode} - ${body}`)));
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
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').substring(0, 15) + 'Z';
    const dateStamp = amzDate.substring(0, 8);
    const region = 'tor1';
    const service = 's3';

    const payloadHash = crypto.createHash('sha256').update('').digest('hex');
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = ['DELETE', `/${key}`, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const signingKey = this.getSignatureKey(dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
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