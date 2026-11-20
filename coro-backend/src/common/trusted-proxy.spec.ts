import express from 'express';
import request from 'supertest';
import { configureTrustedProxies } from './trusted-proxy';

describe('configureTrustedProxies (audit M3-02)', () => {
  function app() {
    const instance = express();
    configureTrustedProxies(instance);
    instance.get('/ip', (req, res) => {
      res.json({ ip: req.ip });
    });
    return instance;
  }

  it('uses the client address appended by the local reverse proxy', async () => {
    const res = await request(app())
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('ignores an address forged by the client in front of the real one', async () => {
    const res = await request(app())
      .get('/ip')
      .set('X-Forwarded-For', '198.51.100.9, 203.0.113.7');
    expect(res.body.ip).toBe('203.0.113.7');
  });

  it('keeps the socket address when no proxy header is present', async () => {
    const res = await request(app()).get('/ip');
    expect(res.body.ip).toMatch(/127\.0\.0\.1|::1/);
  });
});
