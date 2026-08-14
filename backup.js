const { execSync } = require('child_process');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const DATE = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
const BACKUP_FILE = `/tmp/coro_db_${DATE}.sql.gz`;

console.log('Debut du backup...');
execSync(`docker compose -f /opt/coro-platform/docker-compose.yml exec -T postgres pg_dump -U coro_user coro_db | gzip > ${BACKUP_FILE}`, { shell: '/bin/bash' });
console.log('Dump cree:', BACKUP_FILE, fs.statSync(BACKUP_FILE).size, 'bytes');

const fileBuffer = fs.readFileSync(BACKUP_FILE);
const bucket = process.env.DO_SPACES_BUCKET || 'coro-storage';
const accessKey = process.env.DO_SPACES_KEY;
const secretKey = process.env.DO_SPACES_SECRET;
const region = 'tor1';
const objectKey = `backups/coro_db_${DATE}.sql.gz`;
const now = new Date();
const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').substring(0, 15) + 'Z';
const dateStamp = amzDate.substring(0, 8);
const contentType = 'application/gzip';
const payloadHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
const host = `${bucket}.tor1.digitaloceanspaces.com`;
const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
const canonicalRequest = `PUT\n/${objectKey}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
const signingKey = hmac(hmac(hmac(hmac('AWS4' + secretKey, dateStamp), region), 's3'), 'aws4_request');
const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
const options = {
  hostname: host,
  path: `/${objectKey}`,
  method: 'PUT',
  headers: {
    'Content-Type': contentType,
    'Content-Length': fileBuffer.length,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    'x-amz-acl': 'private',
    'Authorization': authorization,
  },
};
const req = https.request(options, (res) => {
  if (res.statusCode === 200 || res.statusCode === 204) {
    console.log('Backup uploade avec succes vers Spaces:', objectKey);
    fs.unlinkSync(BACKUP_FILE);
  } else {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => console.error('Erreur upload:', res.statusCode, body));
  }
});
req.on('error', e => console.error('Erreur:', e));
req.write(fileBuffer);
req.end();