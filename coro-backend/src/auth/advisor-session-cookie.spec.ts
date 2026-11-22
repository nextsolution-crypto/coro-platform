import {
  advisorCsrfSatisfied,
  applySessionCookies,
  extractAdvisorToken,
  readRefreshCookie,
} from './advisor-session-cookie';
import { AuthController } from './auth.controller';

const jwt = 'aaa.bbb.ccc';

describe('M3-05 — session conseiller en cookies protégés', () => {
  it('prend un vrai jeton Bearer, sinon le cookie', () => {
    expect(extractAdvisorToken({ headers: { authorization: `Bearer ${jwt}` } })).toEqual({ token: jwt, viaCookie: false });
    expect(extractAdvisorToken({ headers: { authorization: 'Bearer null', cookie: 'x=1; coro_session=zzz.yyy.www' } })).toEqual({ token: 'zzz.yyy.www', viaCookie: true });
    expect(extractAdvisorToken({ headers: { authorization: 'Bearer cookie' } })).toEqual({ token: null, viaCookie: false });
  });

  it('ne confond pas le cookie du portail client', () => {
    expect(extractAdvisorToken({ headers: { cookie: 'coro_client_session=abc' } }).token).toBeNull();
  });

  it('exige l’en-tête anti-CSRF pour les écritures', () => {
    expect(advisorCsrfSatisfied({ method: 'GET', headers: {} })).toBe(true);
    expect(advisorCsrfSatisfied({ method: 'POST', headers: {} })).toBe(false);
    expect(advisorCsrfSatisfied({ method: 'POST', headers: { 'x-requested-with': 'coro-app' } })).toBe(true);
  });

  it('pose les cookies et retire les jetons du corps', () => {
    const res = { cookie: jest.fn() };
    const out = applySessionCookies(res, { access_token: jwt, refresh_token: 'r', user: { id: 'u' } });
    expect(out).toEqual({ user: { id: 'u' }, session: 'cookie' });
    expect(res.cookie).toHaveBeenCalledWith('coro_session', jwt, expect.objectContaining({ httpOnly: true, path: '/api' }));
    expect(res.cookie).toHaveBeenCalledWith('coro_refresh', 'r', expect.objectContaining({ httpOnly: true, path: '/api/auth' }));
    expect(applySessionCookies(res, { mfaRequired: true } as any)).toEqual({ mfaRequired: true });
  });

  it('renouvelle avec le cookie de renouvellement', async () => {
    const service = { refreshAccessToken: jest.fn().mockResolvedValue({ access_token: jwt, refresh_token: 'r2' }) };
    const controller = new AuthController(service as any);
    const res = { cookie: jest.fn(), clearCookie: jest.fn() };
    await expect(controller.refresh({}, { headers: { cookie: 'coro_refresh=r1' } }, res)).resolves.toEqual({ session: 'cookie' });
    expect(service.refreshAccessToken).toHaveBeenCalledWith('r1');
    expect(readRefreshCookie({ headers: { cookie: 'coro_refresh=r1' } })).toBe('r1');
  });

  it('déconnexion : efface les cookies et révoque le jeton', async () => {
    const service = { revokeRefreshToken: jest.fn().mockResolvedValue({ success: true }) };
    const res = { clearCookie: jest.fn() };
    await new AuthController(service as any).logout({}, { headers: { cookie: 'coro_refresh=r1' } }, res);
    expect(res.clearCookie).toHaveBeenCalledTimes(2);
    expect(service.revokeRefreshToken).toHaveBeenCalledWith('r1');
  });
});
