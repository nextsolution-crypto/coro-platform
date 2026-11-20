import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('production docker-compose hardening (audit M3-02 / M3-03 / T5)', () => {
  const compose = readFileSync(resolve(__dirname, '../../../docker-compose.yml'), 'utf8');

  it('publishes application ports on the loopback interface only', () => {
    const published = [...compose.matchAll(/^\s*-\s*"([^"]*:\d+)"\s*$/gm)].map((m) => m[1]);
    const appPorts = published.filter((p) => /:(3000|3001|3002|3003)$/.test(p));
    expect(appPorts.sort()).toEqual([
      '127.0.0.1:3000:3000',
      '127.0.0.1:3001:3001',
      '127.0.0.1:3002:3002',
      '127.0.0.1:3003:3003',
    ]);
  });

  it('runs the application containers in the Quebec time zone', () => {
    expect(compose.match(/^\s+TZ: America\/Toronto$/gm)?.length).toBe(4);
  });
});
