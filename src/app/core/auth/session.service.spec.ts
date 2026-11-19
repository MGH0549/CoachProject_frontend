import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { Account } from '../api/models/account';
import { AuthenticationService } from '../api/services/authentication.service';
import { ClientService } from '../api/services/client.service';
import { RefreshService } from './refresh.service';
import { SessionService } from './session.service';
import { TokenStore } from './token-store.service';
import { authGuard } from './auth.guard';

describe('Session initialization and persistent-login recovery', () => {
  const account = { fullName: 'Fixture', status: 'Active' } as Account;
  const token = `header.${btoa(JSON.stringify({ role: 'Client', exp: 2000000000 }))}.fixture`;
  let refresh: { refresh: ReturnType<typeof vi.fn> };
  let client: { clientControllerAccount: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    refresh = { refresh: vi.fn() };
    client = { clientControllerAccount: vi.fn().mockReturnValue(of(account)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RefreshService, useValue: refresh },
        { provide: ClientService, useValue: client },
        { provide: AuthenticationService, useValue: {} },
      ],
    });
  });
  const succeed = () =>
    refresh.refresh.mockImplementation(async () => {
      TestBed.inject(TokenStore).token.set(token);
      return token;
    });

  it('shares startup work and waits for the account before becoming authenticated', async () => {
    succeed();
    const accountResponse = new Subject<Account>();
    client.clientControllerAccount.mockReturnValue(accountResponse);
    const session = TestBed.inject(SessionService);
    const first = session.restore();
    expect(session.restore()).toBe(first);
    await Promise.resolve();
    expect(session.state()).toBe('checking');
    accountResponse.next(account);
    accountResponse.complete();
    await first;
    expect(refresh.refresh).toHaveBeenCalledOnce();
    expect(session.account()).toBe(account);
    expect(session.state()).toBe('authenticated');
  });

  it('does not resolve protected routing as logged out after a startup 503', async () => {
    refresh.refresh.mockRejectedValueOnce(new HttpErrorResponse({ status: 503 }));
    const session = TestBed.inject(SessionService);
    let ready = false;
    const waiting = session.waitUntilReady().then(() => {
      ready = true;
    });
    await session.restore();
    expect(session.state()).toBe('unavailable');
    expect(ready).toBe(false);
    expect(session.restorationError()).not.toBe('');
    succeed();
    await session.restore();
    await waiting;
    expect(session.state()).toBe('authenticated');
    expect(ready).toBe(true);
  });

  it('does not rotate again when only loading the account failed temporarily', async () => {
    succeed();
    client.clientControllerAccount.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    const session = TestBed.inject(SessionService);
    await session.restore();
    expect(session.state()).toBe('unavailable');
    expect(TestBed.inject(TokenStore).token()).toBe(token);
    await session.restore();
    expect(session.state()).toBe('authenticated');
    expect(refresh.refresh).toHaveBeenCalledOnce();
  });

  it('marks an explicitly rejected refresh session as unauthenticated', async () => {
    refresh.refresh.mockRejectedValue(
      new HttpErrorResponse({ status: 401, error: { code: 'INVALID_SESSION' } }),
    );
    const session = TestBed.inject(SessionService);
    await session.waitUntilReady();
    expect(session.state()).toBe('unauthenticated');
    expect(TestBed.inject(TokenStore).token()).toBeNull();
    expect(session.account()).toBeNull();
  });

  it('holds the auth guard until restoration succeeds', async () => {
    let release!: () => void;
    refresh.refresh.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          release = () => {
            TestBed.inject(TokenStore).token.set(token);
            resolve(token);
          };
        }),
    );
    const guarded = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/client/training' } as RouterStateSnapshot),
    );
    let finished = false;
    Promise.resolve(guarded).then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);
    release();
    expect(await guarded).toBe(true);
  });

  for (const status of ['Pending', 'Expired', 'Deactivated'] as const) {
    it(`keeps ${status} clients signed in with plan access locked`, async () => {
      succeed();
      client.clientControllerAccount.mockReturnValue(of({ ...account, status }));
      const session = TestBed.inject(SessionService);
      await session.restore();
      expect(session.state()).toBe('authenticated');
      expect(session.isActive()).toBe(false);
      expect(session.home()).toBe('/client/home');
      expect(session.tokens.token()).toBe(token);
    });
  }

  it('unlocks and locks pages reactively when /me changes status', async () => {
    succeed();
    const session = TestBed.inject(SessionService);
    client.clientControllerAccount.mockReturnValue(of({ ...account, status: 'Pending' }));
    await session.restore();
    expect(session.isActive()).toBe(false);
    client.clientControllerAccount.mockReturnValue(of(account));
    await session.loadAccount();
    expect(session.isActive()).toBe(true);
    client.clientControllerAccount.mockReturnValue(of({ ...account, status: 'Expired' }));
    await session.recoverInactiveAccess();
    expect(session.account()?.status).toBe('Expired');
    expect(session.isActive()).toBe(false);
  });

  it('deduplicates inactive recoveries and fails closed during a /me outage', async () => {
    succeed();
    const session = TestBed.inject(SessionService);
    await session.restore();
    client.clientControllerAccount.mockClear();
    client.clientControllerAccount.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503 })),
    );
    await Promise.all([session.recoverInactiveAccess(), session.recoverInactiveAccess()]);
    expect(client.clientControllerAccount).toHaveBeenCalledOnce();
    expect(session.isActive()).toBe(false);
    expect(session.accountUnavailable()).toBe(true);
    expect(session.tokens.token()).toBe(token);
    client.clientControllerAccount.mockReturnValue(of(account));
    await session.loadAccount();
    expect(session.isActive()).toBe(true);
    expect(session.accountUnavailable()).toBe(false);
  });

  it('allows only secure WhatsApp destinations from /me', () => {
    const session = TestBed.inject(SessionService);
    for (const whatsappUrl of [
      'javascript:alert(1)',
      'https://wa.me.evil.test/123',
      'http://wa.me/123',
    ]) {
      session.account.set({ ...account, whatsappUrl });
      expect(session.whatsappUrl()).toBeNull();
    }
    session.account.set({ ...account, whatsappUrl: 'https://wa.me/201234567890' });
    expect(session.whatsappUrl()).toBe('https://wa.me/201234567890');
  });

  it('redirects to login only after a definite rejected session', async () => {
    refresh.refresh.mockRejectedValue(new HttpErrorResponse({ status: 401 }));
    const guarded = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/client/training' } as RouterStateSnapshot),
    );
    expect(TestBed.inject(Router).serializeUrl(guarded as never)).toBe(
      '/auth/sign-in?returnUrl=%2Fclient%2Ftraining',
    );
  });
});
