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
