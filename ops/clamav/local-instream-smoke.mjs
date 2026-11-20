import { createConnection } from 'node:net';

const host = process.env.INCIDENT_REPORT_CLAMAV_HOST || 'clamav';
const port = Number(process.env.INCIDENT_REPORT_CLAMAV_PORT || 3310);
const EICAR = Buffer.from(
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*',
  'ascii',
);

function command(name, bytes) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const chunks = [];
    socket.setTimeout(15_000, () => socket.destroy(new Error('TIMEOUT')));
    socket.once('error', reject);
    socket.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    socket.on('end', () => resolve(Buffer.concat(chunks).toString('utf8').trim()));
    socket.once('connect', () => {
      socket.write(`z${name}\0`);
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

const ping = await command('PING');
const version = await command('VERSION');
const clean = await command('INSTREAM', Buffer.from('CORO_CLAMAV_SYNTHETIC_CLEAN'));
const infected = await command('INSTREAM', EICAR);
if (
  !/^PONG\0?$/u.test(ping) ||
  !/^ClamAV\s+[^/]+\/\d+\/.+/u.test(version) ||
  !/^stream: OK\0?$/u.test(clean) ||
  !/^stream: .+ FOUND\0?$/u.test(infected)
) {
  throw new Error('CLAMAV_LOCAL_INSTREAM_CONTRACT_FAILED');
}
process.stdout.write(
  `${JSON.stringify({
    execution: 'PASS',
    ping: 'PONG',
    versionProtocol: 'PASS',
    cleanInstream: 'CLEAN',
    eicarInstream: 'INFECTED',
    containsCustomerData: false,
  })}\n`,
);
