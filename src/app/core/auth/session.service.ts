import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthenticationService } from '../api/services/authentication.service';
import { ClientService } from '../api/services/client.service';
import { Account } from '../api/models/account';
import { LoginDto } from '../api/models/login-dto';
import { RefreshService } from './refresh.service';
import { TokenStore } from './token-store.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(AuthenticationService);
  private readonly client = inject(ClientService);
  private readonly refresh = inject(RefreshService);
  readonly tokens = inject(TokenStore);
  readonly account = signal<Account | null>(null);
  private restored: Promise<void> | null = null;
  restore(): Promise<void> {
    return (this.restored ??= this.refresh
      .refresh()
      .then(() => this.loadAccount())
      .catch(() => undefined));
  }
  async signIn(body: LoginDto): Promise<void> {
    await this.restore();
    const result = await firstValueFrom(this.api.authControllerLogin({ body }));
    this.tokens.token.set(result.accessToken);
    await this.loadAccount();
  }
  async loadAccount(): Promise<void> {
    if (this.tokens.role() === 'Client')
      this.account.set(await firstValueFrom(this.client.clientControllerAccount()));
  }
  async signOut(): Promise<void> {
    await firstValueFrom(this.api.authControllerLogout());
    this.tokens.token.set(null);
    this.account.set(null);
  }
  home(): string {
    if (this.tokens.role() === 'Coach') return '/coach/clients';
    return this.account()?.status === 'Active' ? '/client/training' : '/auth/pending';
  }
}
