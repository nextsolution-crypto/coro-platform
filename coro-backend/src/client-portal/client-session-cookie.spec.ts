import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ClientJwtGuard } from './client-jwt.guard';
import { extractClientToken, readCookie } from './client-session-cookie';

function context(request: any) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

describe('session client en cookie protégé (M3-05)', () => {
  it('lit le cookie et ignore un en-tête Bearer vide', () => {
    expect(readCookie('a=1; coro_client_session=abc%2E; b=2', 'coro_client_session')).toBe('abc.');
    expect(extractClientToken({ headers: { authorization: 'Bearer null', cookie: 'coro_client_session=tok' } }))
      .toEqual({ token: 'tok', viaCookie: true });
    expect(extractClientToken({ headers: { authorization: 'Bearer real' } })).toEqual({ token: 'real', viaCookie: false });
    expect(extractClientToken({ headers: {} })).toEqual({ token: null, viaCookie: false });
  });

  it('refuse une modification par cookie sans en-tête anti-CSRF', async () => {
    const guard = new ClientJwtGuard({ verify: jest.fn() } as any, {} as any);
    await expect(
      guard.canActivate(context({ method: 'POST', headers: { cookie: 'coro_client_session=tok' } })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige une session', async () => {
    const guard = new ClientJwtGuard({ verify: jest.fn() } as any, {} as any);
    await expect(guard.canActivate(context({ method: 'GET', headers: {} }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepte une lecture par cookie et vérifie le jeton', async () => {
    const verify = jest.fn(() => { throw new Error('expired'); });
    const guard = new ClientJwtGuard({ verify } as any, {} as any);
    await expect(
      guard.canActivate(context({ method: 'GET', headers: { cookie: 'coro_client_session=tok' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).toHaveBeenCalledWith('tok');
  });
});
