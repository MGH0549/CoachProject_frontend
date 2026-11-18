import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-base-url.token';
import { RefreshService } from './refresh.service';
import { AuthDiagnostics } from './auth-diagnostics.service';
import { sessionRejected } from './session-rejected';
import { TokenStore } from './token-store.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const base = inject(API_BASE_URL).replace(/\/$/, '');
  const tokens = inject(TokenStore);
  const refresh = inject(RefreshService);
  const router = inject(Router);
  const diagnostics = inject(AuthDiagnostics);
  if (!request.url.startsWith(`${base}/v1/`) || request.url.startsWith(`${base}/v1/auth/`))
    return next(request);
  const token = tokens.token();
  return next(
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request,
  ).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) return throwError(() => error);
      const expiresAt = tokens.expiresAt();
      diagnostics.log(
        expiresAt !== null && expiresAt <= Date.now() ? 'access_token_expired' : 'api_unauthorized',
        { status: 401, expiresAt },
      );
      const current = tokens.token();
      return from(current && current !== token ? Promise.resolve(current) : refresh.refresh()).pipe(
        catchError((refreshError) => {
          if (sessionRejected(refreshError)) {
            diagnostics.log('logout_triggered', { status: 401, reason: 'session_rejected' });
            void router.navigate(['/auth/sign-in'], { queryParams: { returnUrl: router.url } });
          }
          return throwError(() => refreshError);
        }),
        switchMap((accessToken) =>
          next(request.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })),
        ),
      );
    }),
  );
};
