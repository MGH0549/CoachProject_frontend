import { HttpErrorResponse } from '@angular/common/http';

export function sessionRejected(error: unknown): error is HttpErrorResponse {
  // Network failures, timeouts, 429s, 5xxs and CORS/origin failures are not proof
  // that the refresh session was revoked. Only the refresh endpoint's 401 is.
  return error instanceof HttpErrorResponse && error.status === 401;
}
