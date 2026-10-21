import { gzipSync } from 'zlib';

export interface ArchiveEntry {
  name: string;
  bytes: Buffer;
}

function octal(value: number, width: number) {
  return value.toString(8).padStart(width - 1, '0') + '\0';
}

function header(name: string, size: number): Buffer {
  const block = Buffer.alloc(512, 0);
  block.write(name.replace(/[^a-zA-Z0-9._/-]/g, '_').slice(0, 100), 0, 'utf8');
  block.write(octal(0o600, 8), 100, 'ascii');
  block.write(octal(0, 8), 108, 'ascii');
  block.write(octal(0, 8), 116, 'ascii');
  block.write(octal(size, 12), 124, 'ascii');
  block.write(octal(Math.floor(Date.now() / 1000), 12), 136, 'ascii');
  block.fill(0x20, 148, 156);
  block.write('0', 156, 'ascii');
  block.write('ustar\0', 257, 'ascii');
  block.write('00', 263, 'ascii');
  let checksum = 0;
  for (const byte of block) checksum += byte;
  block.write(octal(checksum, 8), 148, 'ascii');
  return block;
}

export function createTarGz(entries: ArchiveEntry[]): Buffer {
  const chunks: Buffer[] = [];
  for (const entry of entries) {
    chunks.push(header(entry.name, entry.bytes.length), entry.bytes);
    const remainder = entry.bytes.length % 512;
    if (remainder) chunks.push(Buffer.alloc(512 - remainder, 0));
  }
  chunks.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(chunks), { level: 9 });
}
