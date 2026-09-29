import { RequestIdMiddleware } from './request-id.middleware';

describe('RequestIdMiddleware', () => {
  it('accepte un identifiant strict et le retourne', (done) => {
    const response = { setHeader: jest.fn() } as any;
    new RequestIdMiddleware().use({ header: () => 'safe-request-123' } as any, response, () => {
      expect(response.setHeader).toHaveBeenCalledWith('X-Request-ID', 'safe-request-123');
      done();
    });
  });

  it('remplace un identifiant invalide', (done) => {
    const response = { setHeader: jest.fn() } as any;
    new RequestIdMiddleware().use({ header: () => 'bad\nvalue' } as any, response, () => {
      expect(response.setHeader.mock.calls[0][1]).toMatch(/^[0-9a-f-]{36}$/);
      done();
    });
  });
});
