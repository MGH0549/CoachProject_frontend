import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { Session } from '../api/models/session';
import { TokenStore } from './token-store.service';

@Injectable({ providedIn: 'root' })
export class RefreshService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly base = inject(API_BASE_URL);
  private readonly tokens = inject(TokenStore);
  private pending: Promise<string> | null = null;
  refresh(): Promise<string> {
    if (!this.pending) {
      this.pending = firstValueFrom(
        this.http
          .post<Session>(`${this.base}/v1/auth/refresh`, {}, { withCredentials: true })
          .pipe(timeout(8000)),
      )
        .then((session) => {
          this.tokens.token.set(session.accessToken);
          return session.accessToken;
        })
        .catch((error) => {
          this.tokens.token.set(null);
          throw error;
        })
        .finally(() => {
          this.pending = null;
        });
    }
    return this.pending;
  }
}
