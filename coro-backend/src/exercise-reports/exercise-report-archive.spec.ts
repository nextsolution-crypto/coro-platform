import { gunzipSync } from 'zlib';
import { createTarGz } from './exercise-report-archive';

function names(bytes: Buffer) {
  const tar = gunzipSync(bytes);
  const result: string[] = [];
  let offset = 0;
  while (offset + 512 <= tar.length) {
    const name = tar
      .subarray(offset, offset + 100)
      .toString('utf8')
      .replace(/\0.*$/, '');
    if (!name) break;
    const sizeText = tar
      .subarray(offset + 124, offset + 136)
      .toString('ascii')
      .replace(/\0.*$/, '')
      .trim();
    const size = Number.parseInt(sizeText || '0', 8);
    result.push(name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return result;
}

describe('createTarGz', () => {
  it('materially packages the manifest, official PDF and authorized evidence', () => {
    const archive = createTarGz([
      { name: 'manifest.json', bytes: Buffer.from('{}') },
      { name: 'official/report-v1.pdf', bytes: Buffer.from('%PDF-1.7') },
      { name: 'evidence/action/evidence.txt', bytes: Buffer.from('synthetic') },
    ]);
    expect(names(archive)).toEqual([
      'manifest.json',
      'official/report-v1.pdf',
      'evidence/action/evidence.txt',
    ]);
  });
});
