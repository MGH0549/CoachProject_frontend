import { Injectable } from '@angular/core';

type AuthEvent =
  | 'access_token_expired'
  | 'api_unauthorized'
  | 'refresh_started'
  | 'refresh_joined'
  | 'refresh_succeeded'
  | 'refresh_failed'
  | 'session_restoration_failed'
  | 'sign_in_succeeded'
  | 'logout_triggered';

@Injectable({ providedIn: 'root' })
export class AuthDiagnostics {
  log(
    event: AuthEvent,
    details: {
      status?: number;
      expiresAt?: number | null;
      reason?: 'session_rejected' | 'temporary_failure' | 'user_requested';
    } = {},
  ): void {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('forma-auth-debug') === '1') {
        // The schema deliberately excludes headers, bodies, URLs, and token values.
        console.info('[auth]', { event, ...details });
      }
    } catch {
      // Diagnostics must never affect authentication.
    }
  }
}
