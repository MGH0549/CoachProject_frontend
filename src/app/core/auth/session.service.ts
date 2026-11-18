import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../api/services/authentication.service';
import { ClientService } from '../api/services/client.service';
import { Account } from '../api/models/account';
import { LoginDto } from '../api/models/login-dto';
import { RefreshService } from './refresh.service';
import { TokenStore } from './token-store.service';
import { withAuthSessionLock } from './auth-session-lock';
import { AuthDiagnostics } from './auth-diagnostics.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(AuthenticationService);
  private readonly client = inject(ClientService);
  private readonly refresh = inject(RefreshService);
  private readonly diagnostics = inject(AuthDiagnostics);
  readonly tokens = inject(TokenStore);
  readonly account = signal<Account | null>(null);
  private restored: Promise<void> | null = null;
  restore(): Promise<void> {
    return (this.restored ??= this.refresh
      .refresh()
      .then(() => this.loadAccount())
      .catch(() => {
        // A transient outage during startup must not permanently disable restoration.
        this.restored = null;
        this.diagnostics.log('session_restoration_failed');
      }));
  }
  async signIn(body: LoginDto): Promise<void> {
    await this.restore();
    await withAuthSessionLock(async () => {
      const result = await firstValueFrom(this.api.authControllerLogin({ body }));
      this.tokens.token.set(result.accessToken);
      this.diagnostics.log('sign_in_succeeded', { expiresAt: this.tokens.expiresAt() });
    });
    await this.loadAccount();
    this.restored = Promise.resolve();
  }
  async loadAccount(): Promise<void> {
    if (this.tokens.role() === 'Client')
      this.account.set(await firstValueFrom(this.client.clientControllerAccount()));
  }
  async signOut(): Promise<void> {
    this.diagnostics.log('logout_triggered', { reason: 'user_requested' });
    await withAuthSessionLock(async () => {
      await firstValueFrom(this.api.authControllerLogout());
      this.tokens.token.set(null);
      this.account.set(null);
      this.restored = null;
    });
  }
  home(): string {
    if (this.tokens.role() === 'Coach') return '/coach/clients';
    return this.account()?.status === 'Active' ? '/client/training' : '/auth/pending';
  }
}
