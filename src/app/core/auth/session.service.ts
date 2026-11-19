import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../api/services/authentication.service';
import { ClientService } from '../api/services/client.service';
import { Account } from '../api/models/account';
import { LoginDto } from '../api/models/login-dto';
import { RefreshService } from './refresh.service';
import { TokenStore } from './token-store.service';
import { withAuthSessionLock } from './auth-session-lock';
import { AuthDiagnostics } from './auth-diagnostics.service';
import { sessionRejected } from './session-rejected';

export type SessionState = 'checking' | 'authenticated' | 'unauthenticated' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(AuthenticationService);
  private readonly client = inject(ClientService);
  private readonly refresh = inject(RefreshService);
  private readonly diagnostics = inject(AuthDiagnostics);
  readonly tokens = inject(TokenStore);
  readonly account = signal<Account | null>(null);
  readonly accountUnavailable = signal(false);
  readonly accessBlocked = signal(false);
  readonly isActive = computed(
    () =>
      this.account()?.status === 'Active' && !this.accountUnavailable() && !this.accessBlocked(),
  );
  readonly whatsappUrl = computed(() => {
    try {
      const url = new URL(this.account()?.whatsappUrl ?? '');
      return url.protocol === 'https:' && ['wa.me', 'api.whatsapp.com'].includes(url.hostname)
        ? url.href
        : null;
    } catch {
      return null;
    }
  });
  private accountRequest: Promise<void> | null = null;
  private inactiveRecovery: Promise<void> | null = null;
  readonly state = signal<SessionState>('checking');
  readonly restorationError = signal('');
  private restored: Promise<void> | null = null;
  private resolveReady!: () => void;
  private readonly ready = new Promise<void>((resolve) => (this.resolveReady = resolve));

  constructor() {
    effect(() => {
      if (this.state() === 'authenticated' && !this.tokens.token()) this.markSignedOut();
    });
  }

  /** Guards wait for a definite result, including across a temporary startup outage. */
  waitUntilReady(): Promise<void> {
    if (this.state() === 'checking' && !this.restored) void this.restore();
    return this.ready;
  }

  restore(): Promise<void> {
    if (this.restored) return this.restored;
    if (this.state() === 'authenticated' || this.state() === 'unauthenticated')
      return Promise.resolve();
    this.state.set('checking');
    this.restorationError.set('');
    this.restored = this.restoreAttempt().finally(() => {
      if (this.state() === 'unavailable') {
        this.restored = null;
      }
    });
    return this.restored;
  }

  private async restoreAttempt(): Promise<void> {
    try {
      if (!this.tokens.token()) await this.refresh.refresh();
      await this.loadAccount();
      this.state.set('authenticated');
      this.resolveReady();
    } catch (error) {
      if (sessionRejected(error)) {
        this.markSignedOut();
      } else {
        this.state.set('unavailable');
        this.restorationError.set(
          'تعذر التحقق من جلستك الآن. تحقق من اتصال الإنترنت ثم أعد المحاولة. لم يتم تسجيل خروجك.',
        );
        this.diagnostics.log('session_restoration_failed');
      }
    }
  }

  private markSignedOut(): void {
    this.tokens.token.set(null);
    this.account.set(null);
    this.accountUnavailable.set(false);
    this.accessBlocked.set(false);
    this.state.set('unauthenticated');
    this.resolveReady();
  }
  async signIn(body: LoginDto): Promise<void> {
    await this.restore();
    await withAuthSessionLock(async () => {
      const result = await firstValueFrom(this.api.authControllerLogin({ body }));
      this.tokens.token.set(result.accessToken);
      this.diagnostics.log('sign_in_succeeded', { expiresAt: this.tokens.expiresAt() });
    });
    await this.loadAccount();
    this.state.set('authenticated');
    this.resolveReady();
    this.restored = Promise.resolve();
  }
  loadAccount(): Promise<void> {
    if (this.tokens.role() !== 'Client') return Promise.resolve();
    if (this.accountRequest) return this.accountRequest;
    this.accountRequest = firstValueFrom(this.client.clientControllerAccount())
      .then((account) => {
        this.account.set(account);
        this.accountUnavailable.set(false);
        // A 403 recovery stays blocked until an explicit successful status refresh.
        if (!this.inactiveRecovery) this.accessBlocked.set(false);
      })
      .catch((error) => {
        this.accountUnavailable.set(true);
        throw error;
      })
      .finally(() => (this.accountRequest = null));
    return this.accountRequest;
  }
  recoverInactiveAccess(): Promise<void> {
    this.accessBlocked.set(true);
    if (!this.inactiveRecovery) {
      this.inactiveRecovery = this.loadAccount()
        .catch(() => undefined)
        .finally(() => (this.inactiveRecovery = null));
    }
    return this.inactiveRecovery;
  }
  async signOut(): Promise<void> {
    this.diagnostics.log('logout_triggered', { reason: 'user_requested' });
    await withAuthSessionLock(async () => {
      await firstValueFrom(this.api.authControllerLogout());
      this.markSignedOut();
      this.restored = null;
    });
  }
  home(): string {
    if (this.tokens.role() === 'Coach') return '/coach/clients';
    return '/client/home';
  }
}
