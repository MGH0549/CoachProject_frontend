import { HttpErrorResponse } from '@angular/common/http';

export function isInactiveAccess(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 403 &&
    error.error?.code === 'ACCESS_INACTIVE'
  );
}
