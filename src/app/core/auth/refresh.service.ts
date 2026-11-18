import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { Session } from '../api/models/session';
import { TokenStore } from './token-store.service';
import { withAuthSessionLock } from './auth-session-lock';
import { AuthDiagnostics } from './auth-diagnostics.service';
import { sessionRejected } from './session-rejected';

@Injectable({ providedIn: 'root' })
export class RefreshService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly base = inject(API_BASE_URL);
  private readonly tokens = inject(TokenStore);
  private readonly diagnostics = inject(AuthDiagnostics);
  private pending: Promise<string> | null = null;
  refresh(): Promise<string> {
    if (!this.pending) {
      this.pending = withAuthSessionLock(() => {
        this.diagnostics.log('refresh_started', { expiresAt: this.tokens.expiresAt() });
        return firstValueFrom(
          this.http
            .post<Session>(
              `${this.base.replace(/\/$/, '')}/v1/auth/refresh`,
              {},
              { withCredentials: true },
            )
            .pipe(timeout(8000)),
        )
          .then((session) => {
            this.tokens.token.set(session.accessToken);
            this.diagnostics.log('refresh_succeeded', { expiresAt: this.tokens.expiresAt() });
            return session.accessToken;
          })
          .catch((error) => {
            const rejected = sessionRejected(error);
            if (rejected) this.tokens.token.set(null);
            this.diagnostics.log('refresh_failed', {
              ...(error instanceof HttpErrorResponse ? { status: error.status } : {}),
              reason: rejected ? 'session_rejected' : 'temporary_failure',
            });
            throw error;
          });
      }).finally(() => {
        this.pending = null;
      });
    } else this.diagnostics.log('refresh_joined');
    return this.pending;
  }
}
